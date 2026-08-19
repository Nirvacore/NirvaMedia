# Advanced ML Integration - Phase 14

## Overview

This document outlines the integration of machine learning capabilities into the NMD Platform, enabling predictive analytics, personalized recommendations, and intelligent content optimization.

**ML Capabilities:**
- **Predictive Analytics:** Performance forecasting, trend prediction
- **Recommendations:** Smart content suggestions, personalized dashboards
- **Content Intelligence:** Quality scoring, sentiment analysis, topic extraction
- **Anomaly Detection:** Unusual activity, performance drops
- **Auto-Optimization:** Headline suggestions, optimal posting times, audience targeting

**Technology Stack:**
- **ML Framework:** TensorFlow.js (browser) + Python (server)
- **Model Serving:** TensorFlow Serving or MLflow
- **Training Data:** PostgreSQL + S3
- **Feature Store:** Feast (feature management)
- **Monitoring:** ML monitoring dashboard
- **Infrastructure:** GPU-enabled training (AWS SageMaker or local)

**Timeline:** 12 weeks
**Team:** 2-3 ML engineers, 1 data scientist, 1 platform engineer

---

## 1. ML Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NMD Platform + ML                        │
└─────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Frontend  │  │   Mobile   │  │    API     │
    │ (TF.js)    │  │  (TF Lite) │  │  (Python)  │
    └────────────┘  └────────────┘  └────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
            ┌────────────────────────┐
            │    Model Inference     │
            │   (REST API Layer)     │
            └────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Recom.   │   │Predictive│   │ Anomaly  │
    │ Engine   │   │Analytics │   │Detection │
    └──────────┘   └──────────┘   └──────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
            ┌────────────────────────┐
            │   Feature Store        │
            │   (Feast)              │
            └────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │Database  │   │  S3      │   │  Cache   │
    │(Training)│   │ (Metrics)│   │(Features)│
    └──────────┘   └──────────┘   └──────────┘
```

---

## 2. Predictive Analytics

### 2.1 Performance Forecasting

**Model:** Prophet (Facebook) or LSTM for time-series

```python
# ml/models/performance_forecaster.py
from fbprophet import Prophet
import pandas as pd
import numpy as np

class PerformanceForecaster:
    """Forecast content performance (views, engagement, clicks)"""
    
    def __init__(self):
        self.models = {}  # Org-specific models
        self.feature_importance = {}
    
    def train(self, org_id: str, historical_data: pd.DataFrame):
        """
        Train forecasting model on historical performance data
        
        Input: DataFrame with columns:
        - ds (datetime): date
        - y (numeric): metric value (views, clicks, etc.)
        - cap (numeric): growth cap (optional)
        """
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            interval_width=0.95,  # 95% confidence intervals
            changepoint_prior_scale=0.05,  # Flexibility to trend changes
        )
        
        # Add regressors for additional features
        model.add_regressor('day_of_week')
        model.add_regressor('is_weekend')
        model.add_regressor('is_holiday')
        
        model.fit(historical_data)
        self.models[org_id] = model
        
        return model
    
    def forecast(
        self,
        org_id: str,
        periods: int = 7,  # 7-day forecast
        metric: str = 'views'
    ) -> dict:
        """Forecast next N periods"""
        if org_id not in self.models:
            raise ValueError(f'No model trained for org {org_id}')
        
        model = self.models[org_id]
        future = model.make_future_dataframe(periods=periods)
        
        # Add features for future dates
        future = self._add_features(future)
        
        forecast = model.predict(future)
        
        # Return in structured format
        return {
            'forecast': forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(periods).to_dict('records'),
            'trend': self._extract_trend(forecast),
            'seasonality': self._extract_seasonality(forecast),
            'confidence': 0.95,
        }
    
    def _add_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add derived features"""
        df['day_of_week'] = df['ds'].dt.dayofweek
        df['is_weekend'] = df['ds'].dt.dayofweek.isin([5, 6]).astype(int)
        df['is_holiday'] = df['ds'].dt.dayofyear.isin([1, 4, 7, 12])  # Sample holidays
        return df
    
    def _extract_trend(self, forecast: pd.DataFrame) -> dict:
        """Analyze trend direction"""
        recent = forecast['trend'].iloc[-7:]
        slope = (recent.iloc[-1] - recent.iloc[0]) / 7
        
        return {
            'direction': 'up' if slope > 0 else 'down',
            'strength': abs(slope),
            'change_percent': (slope / recent.iloc[0]) * 100 if recent.iloc[0] != 0 else 0,
        }
    
    def _extract_seasonality(self, forecast: pd.DataFrame) -> dict:
        """Extract seasonal patterns"""
        seasonal = forecast['seasonal'].tail(7)
        
        return {
            'pattern': 'strong' if seasonal.std() > seasonal.mean() * 0.5 else 'weak',
            'peak_day': seasonal.idxmax(),
            'amplitude': seasonal.max() - seasonal.min(),
        }
```

### 2.2 Trend Detection

```python
# ml/models/trend_analyzer.py
from sklearn.preprocessing import StandardScaler
from scipy import stats
import numpy as np

class TrendAnalyzer:
    """Detect emerging trends and patterns"""
    
    def detect_trend_shift(
        self,
        time_series: np.ndarray,
        window_size: int = 14  # 2 weeks
    ) -> dict:
        """Detect when trend changes significantly"""
        
        n = len(time_series)
        if n < window_size * 2:
            return {'trend_shifts': []}
        
        shifts = []
        
        for i in range(window_size, n - window_size):
            # Compare two windows
            before = time_series[i-window_size:i]
            after = time_series[i:i+window_size]
            
            # Statistical significance test
            stat, p_value = stats.ttest_ind(before, after)
            
            if p_value < 0.05:  # Significant change
                shift_magnitude = (after.mean() - before.mean()) / before.mean() * 100
                shifts.append({
                    'date_index': i,
                    'magnitude_percent': shift_magnitude,
                    'p_value': p_value,
                    'direction': 'up' if shift_magnitude > 0 else 'down',
                })
        
        return {
            'trend_shifts': shifts,
            'significant_shifts_count': len(shifts),
            'trend_stability': 100 - (len(shifts) / n * 100),  # % stability
        }
    
    def seasonal_decomposition(self, time_series: np.ndarray) -> dict:
        """Decompose into trend, seasonality, residual"""
        from statsmodels.tsa.seasonal import seasonal_decompose
        
        # Assume daily data with yearly seasonality
        decomposition = seasonal_decompose(
            time_series,
            model='additive',
            period=365,
            extrapolate='fill_ea'
        )
        
        return {
            'trend': decomposition.trend.tolist(),
            'seasonal': decomposition.seasonal.tolist(),
            'residual': decomposition.resid.tolist(),
            'seasonal_strength': 1 - (np.var(decomposition.resid) / np.var(decomposition.seasonal + decomposition.resid)),
        }
```

---

## 3. Recommendation Engine

### 3.1 Content Recommendations

```python
# ml/models/recommendation_engine.py
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List

class RecommendationEngine:
    """Recommend content to users based on preferences and behavior"""
    
    def __init__(self):
        self.user_vectors = {}  # User preference vectors
        self.content_vectors = {}  # Content feature vectors
        self.similarity_cache = {}
    
    def build_user_profile(
        self,
        user_id: str,
        interactions: List[dict]  # [{content_id, viewed, clicked, liked, time_spent}]
    ) -> np.ndarray:
        """Build user preference vector from interactions"""
        
        # Features: topic, format, sentiment, complexity, audience
        features = {
            'topic': {},  # Topic distribution
            'format': {},  # Preferred formats (blog, social, video, etc.)
            'sentiment': 0,  # Preferred tone
            'recency': 0,  # Recent vs. evergreen
            'complexity': 0,  # Technical level
        }
        
        total_engagement = 0
        
        for interaction in interactions:
            content = self._get_content_features(interaction['content_id'])
            weight = self._calculate_engagement_weight(interaction)
            
            # Accumulate weighted features
            for topic, count in content['topics'].items():
                features['topic'][topic] = features['topic'].get(topic, 0) + weight * count
            
            features['format'][content['format']] = features['format'].get(content['format'], 0) + weight
            features['sentiment'] += weight * content['sentiment']
            features['recency'] += weight * content['recency']
            features['complexity'] += weight * content['complexity']
            
            total_engagement += weight
        
        # Normalize
        if total_engagement > 0:
            features['sentiment'] /= total_engagement
            features['recency'] /= total_engagement
            features['complexity'] /= total_engagement
        
        # Convert to vector
        vector = self._features_to_vector(features)
        self.user_vectors[user_id] = vector
        
        return vector
    
    def get_recommendations(
        self,
        user_id: str,
        top_k: int = 10,
        exclude_ids: List[str] = None
    ) -> List[dict]:
        """Get top-K content recommendations"""
        
        if user_id not in self.user_vectors:
            return []  # Use fallback if user profile not available
        
        user_vector = self.user_vectors[user_id]
        scores = []
        
        for content_id, content_vector in self.content_vectors.items():
            # Skip if already seen
            if exclude_ids and content_id in exclude_ids:
                continue
            
            # Calculate similarity
            similarity = cosine_similarity([user_vector], [content_vector])[0][0]
            scores.append({
                'content_id': content_id,
                'score': similarity,
                'reason': self._generate_reason(user_id, content_id, similarity),
            })
        
        # Sort and return top-K
        scores.sort(key=lambda x: x['score'], reverse=True)
        return scores[:top_k]
    
    def collaborative_filtering(
        self,
        user_id: str,
        top_k: int = 10
    ) -> List[dict]:
        """Use collaborative filtering: similar users like similar content"""
        
        # Find similar users
        similar_users = self._find_similar_users(user_id, top_k=5)
        
        # Get content they liked but user hasn't seen
        recommendations = {}
        for similar_user in similar_users:
            liked_content = self._get_user_liked_content(similar_user['user_id'])
            for content in liked_content:
                if content['content_id'] not in recommendations:
                    recommendations[content['content_id']] = {
                        'score': 0,
                        'reasons': [],
                    }
                
                recommendations[content['content_id']]['score'] += similar_user['similarity'] * content['engagement']
                recommendations[content['content_id']]['reasons'].append(
                    f"Similar to user {similar_user['user_id']}"
                )
        
        # Sort and return
        sorted_recs = sorted(
            [{'content_id': k, **v} for k, v in recommendations.items()],
            key=lambda x: x['score'],
            reverse=True
        )
        
        return sorted_recs[:top_k]
    
    def _calculate_engagement_weight(self, interaction: dict) -> float:
        """Calculate weight from engagement metrics"""
        weight = 0
        weight += interaction.get('viewed', 0) * 1.0  # View = 1 point
        weight += interaction.get('clicked', 0) * 2.0  # Click = 2 points
        weight += interaction.get('liked', 0) * 3.0  # Like = 3 points
        weight += min(interaction.get('time_spent', 0) / 300, 5)  # 5 min = 5 points max
        return weight
    
    def _get_content_features(self, content_id: str) -> dict:
        """Get pre-computed content features"""
        # In production, fetch from feature store
        return self.content_vectors.get(content_id, {})
    
    def _features_to_vector(self, features: dict) -> np.ndarray:
        """Convert feature dict to normalized vector"""
        vector = []
        # Flatten dictionary to vector
        for key in sorted(features.keys()):
            if isinstance(features[key], dict):
                vector.extend(features[key].values())
            else:
                vector.append(features[key])
        return np.array(vector) / (np.linalg.norm(vector) + 1e-8)  # Normalize
```

### 3.2 Optimal Posting Time

```python
# ml/models/posting_optimizer.py
from scipy.stats import entropy
import numpy as np

class PostingOptimizer:
    """Determine optimal time to publish content"""
    
    def analyze_audience_activity(
        self,
        org_id: str,
        hours_back: int = 90  # 3 months
    ) -> dict:
        """Analyze when audience is most active"""
        
        # Get activity data: views/clicks by hour
        activity_by_hour = self._get_activity_distribution(org_id, hours_back)
        
        # Calculate metrics
        peak_hours = np.argsort(activity_by_hour)[-3:]  # Top 3 hours
        distribution_entropy = entropy(activity_by_hour + 1e-8)  # Higher = more spread
        
        return {
            'peak_hours': [int(h) for h in peak_hours],
            'peak_values': [float(activity_by_hour[int(h)]) for h in peak_hours],
            'distribution_entropy': float(distribution_entropy),
            'is_consistent': distribution_entropy < 2.0,  # Lower = more consistent
            'recommendation': self._get_posting_recommendation(activity_by_hour),
        }
    
    def optimal_times_for_content(
        self,
        org_id: str,
        content_type: str  # blog, social, video, email
    ) -> List[dict]:
        """Get optimal posting times for specific content type"""
        
        # Different types have different optimal times
        type_weights = {
            'blog': [9, 14, 19],  # Morning, afternoon, evening
            'social': [6, 12, 18, 21],  # Throughout day
            'video': [7, 17],  # Morning, after work
            'email': [8, 13, 19],  # Morning, lunch, evening
        }
        
        activity = self._get_activity_distribution(org_id, 90)
        weights = type_weights.get(content_type, [9, 14, 19])
        
        recommendations = []
        for hour in weights:
            score = activity[hour] * 0.7  # Base activity
            
            # Add engagement multiplier (CTR, likes, etc.)
            engagement_multiplier = self._get_engagement_multiplier(org_id, hour, content_type)
            score *= engagement_multiplier
            
            recommendations.append({
                'hour': hour,
                'score': float(score),
                'timezone_note': 'UTC (adjust for your timezone)',
            })
        
        return sorted(recommendations, key=lambda x: x['score'], reverse=True)
    
    def _get_activity_distribution(self, org_id: str, hours_back: int) -> np.ndarray:
        """Get views/clicks by hour"""
        # Query last N hours of data
        # In production: query from feature store
        return np.random.uniform(100, 1000, 24)  # Placeholder
    
    def _get_posting_recommendation(self, activity: np.ndarray) -> str:
        """Generate human-readable recommendation"""
        peak_hour = np.argmax(activity)
        return f"Post at {peak_hour}:00 UTC for best engagement"
```

---

## 4. Content Intelligence

### 4.1 Quality Scoring

```python
# ml/models/content_quality_scorer.py
from textblob import TextBlob
from nltk.tokenize import sent_tokenize
import re

class ContentQualityScorer:
    """Score content quality across multiple dimensions"""
    
    def score_content(self, content: dict) -> dict:
        """
        Calculate quality score (0-100)
        
        Dimensions:
        - Readability (20 points)
        - Engagement (20 points)
        - SEO (20 points)
        - Completeness (20 points)
        - Uniqueness (20 points)
        """
        scores = {
            'readability': self._score_readability(content['text']),
            'engagement': self._score_engagement(content['text']),
            'seo': self._score_seo(content),
            'completeness': self._score_completeness(content),
            'uniqueness': self._score_uniqueness(content.get('text', '')),
        }
        
        overall_score = sum(scores.values()) / len(scores)
        
        return {
            'overall_score': round(overall_score, 1),
            'dimension_scores': {k: round(v, 1) for k, v in scores.items()},
            'recommendations': self._generate_recommendations(scores, content),
            'grade': self._score_to_grade(overall_score),
        }
    
    def _score_readability(self, text: str) -> float:
        """Score based on readability metrics"""
        sentences = sent_tokenize(text)
        words = text.split()
        
        # Flesch Reading Ease
        avg_sentence_length = len(words) / max(len(sentences), 1)
        avg_word_length = sum(len(w) for w in words) / max(len(words), 1)
        
        score = 206.835 - 1.015 * avg_sentence_length - 84.6 * (avg_word_length / 5)
        score = max(0, min(100, score))  # Clamp to 0-100
        
        # Bonus for paragraphs and structure
        paragraphs = text.split('\n\n')
        structure_bonus = min(10, len(paragraphs) * 2)
        
        return min(20, (score / 100) * 15 + structure_bonus)
    
    def _score_engagement(self, text: str) -> float:
        """Score engagement potential"""
        score = 0
        
        # Questions (engagement drivers)
        questions = text.count('?')
        score += min(5, questions * 1.5)
        
        # Exclamation marks (emotion)
        exclamations = text.count('!')
        score += min(3, exclamations)
        
        # Lists (easy to scan)
        list_items = len(re.findall(r'^[\*\-\+]\s', text, re.MULTILINE))
        score += min(5, list_items * 0.5)
        
        # Call-to-action keywords
        cta_keywords = ['click', 'discover', 'learn', 'try', 'explore']
        cta_count = sum(text.lower().count(kw) for kw in cta_keywords)
        score += min(5, cta_count)
        
        # Word count (longer = more engagement potential)
        word_count = len(text.split())
        if 300 < word_count < 2000:
            score += 2
        
        return min(20, score)
    
    def _score_seo(self, content: dict) -> float:
        """Score SEO optimization"""
        score = 0
        text = content.get('text', '')
        
        # Keyword in title
        if content.get('title'):
            title = content['title'].lower()
            keywords = content.get('keywords', [])
            if any(kw.lower() in title for kw in keywords):
                score += 5
        
        # Keyword density (2-3% is optimal)
        if content.get('keywords'):
            kw = content['keywords'][0].lower()
            kw_count = text.lower().count(kw)
            word_count = len(text.split())
            density = (kw_count / max(word_count, 1)) * 100
            
            if 2 <= density <= 3:
                score += 5
            elif 1 <= density < 5:
                score += 3
        
        # Meta description
        if content.get('meta_description') and len(content['meta_description']) > 50:
            score += 5
        
        # Heading structure
        headings = len(re.findall(r'^#+\s', text, re.MULTILINE))
        if headings >= 3:
            score += 5
        
        return min(20, score)
    
    def _score_completeness(self, content: dict) -> float:
        """Score how complete/thorough the content is"""
        score = 0
        
        # Has title
        if content.get('title'):
            score += 4
        
        # Has description/intro
        if content.get('description') or content.get('text', '').split('\n')[0]:
            score += 4
        
        # Has media (image, video)
        if content.get('media') or content.get('images'):
            score += 4
        
        # Has links/references
        links = len(re.findall(r'https?://', content.get('text', '')))
        if links > 0:
            score += 4
        
        # Has call-to-action
        if 'click' in content.get('text', '').lower() or content.get('cta'):
            score += 4
        
        return min(20, score)
    
    def _score_uniqueness(self, text: str) -> float:
        """Simple uniqueness scoring (more sophisticated = external plagiarism check)"""
        # This is simplified; in production use Copyscape API or similar
        unique_phrases = len(set(text.split()))
        total_phrases = len(text.split())
        
        uniqueness_ratio = unique_phrases / max(total_phrases, 1)
        
        # 0.4-0.6 is normal (some repeated words), >0.6 is unique
        if uniqueness_ratio > 0.6:
            score = 20
        elif uniqueness_ratio > 0.5:
            score = 15
        elif uniqueness_ratio > 0.4:
            score = 10
        else:
            score = 5
        
        return min(20, score)
    
    def _generate_recommendations(self, scores: dict, content: dict) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if scores['readability'] < 10:
            recommendations.append('Simplify sentences and use shorter paragraphs')
        if scores['engagement'] < 10:
            recommendations.append('Add more questions or call-to-action elements')
        if scores['seo'] < 10:
            recommendations.append('Optimize title and add relevant keywords')
        if scores['completeness'] < 15:
            recommendations.append('Add media (images/videos) and links')
        if scores['uniqueness'] < 10:
            recommendations.append('Increase original content and reduce duplication')
        
        return recommendations
    
    def _score_to_grade(self, score: float) -> str:
        """Convert score to letter grade"""
        if score >= 85:
            return 'A'
        elif score >= 75:
            return 'B'
        elif score >= 65:
            return 'C'
        elif score >= 50:
            return 'D'
        else:
            return 'F'
```

---

## 5. Deployment & Serving

### 5.1 Model Serving API

```python
# ml/api/serving.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pickle

app = FastAPI(title="NMD ML API", version="1.0.0")

# Load models on startup
performance_forecaster = joblib.load('models/performance_forecaster.pkl')
recommendation_engine = pickle.load(open('models/recommendation_engine.pkl', 'rb'))
quality_scorer = joblib.load('models/content_quality_scorer.pkl')

class ForecastRequest(BaseModel):
    org_id: str
    metric: str
    periods: int = 7

class RecommendationRequest(BaseModel):
    user_id: str
    top_k: int = 10
    exclude_ids: List[str] = []

class ContentScoringRequest(BaseModel):
    title: str
    text: str
    keywords: List[str] = []
    meta_description: str = ""

@app.post("/forecast")
async def forecast(request: ForecastRequest):
    """Forecast performance metrics"""
    try:
        result = performance_forecaster.forecast(
            org_id=request.org_id,
            periods=request.periods,
            metric=request.metric
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/recommend")
async def recommend(request: RecommendationRequest):
    """Get content recommendations"""
    try:
        result = recommendation_engine.get_recommendations(
            user_id=request.user_id,
            top_k=request.top_k,
            exclude_ids=request.exclude_ids
        )
        return {'recommendations': result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/score-content")
async def score_content(request: ContentScoringRequest):
    """Score content quality"""
    try:
        content = {
            'title': request.title,
            'text': request.text,
            'keywords': request.keywords,
            'meta_description': request.meta_description,
        }
        result = quality_scorer.score_content(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "models_loaded": True}
```

### 5.2 Integration with API Gateway

```typescript
// server/api/routes/ml.routes.ts
import { Router } from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

// Get performance forecast
router.get('/forecast/:contentId', authenticate, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { periods = 7, metric = 'views' } = req.query;

    // Get org from auth
    const orgId = req.user.organizationId;

    // Call ML API
    const mlResponse = await axios.post(`${ML_API_URL}/forecast`, {
      org_id: orgId,
      metric,
      periods: parseInt(periods),
    });

    res.json(mlResponse.data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get content recommendations
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { top_k = 10 } = req.query;

    const mlResponse = await axios.post(`${ML_API_URL}/recommend`, {
      user_id: userId,
      top_k: parseInt(top_k),
    });

    res.json(mlResponse.data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Score content quality
router.post('/score-content', authenticate, async (req, res) => {
  try {
    const { title, text, keywords = [], meta_description = '' } = req.body;

    const mlResponse = await axios.post(`${ML_API_URL}/score-content`, {
      title,
      text,
      keywords,
      meta_description,
    });

    res.json(mlResponse.data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

---

## 6. Monitoring & Evaluation

### 6.1 Model Performance Metrics

```python
# ml/monitoring/metrics.py
class ModelMonitoring:
    """Track ML model performance over time"""
    
    def evaluate_recommendation_quality(
        self,
        predictions: List[str],
        actual_engagements: List[bool]
    ) -> dict:
        """Evaluate recommendation accuracy"""
        from sklearn.metrics import (
            precision_score,
            recall_score,
            ndcg_score,
            mean_average_precision
        )
        
        return {
            'precision@10': precision_score(actual_engagements, predictions[:10]),
            'recall@10': recall_score(actual_engagements, predictions[:10]),
            'ndcg_score': ndcg_score([actual_engagements], [predictions]),
            'map_score': mean_average_precision(actual_engagements, predictions),
        }
    
    def evaluate_forecast_accuracy(
        self,
        forecasted_values: List[float],
        actual_values: List[float]
    ) -> dict:
        """Evaluate forecast accuracy"""
        from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error
        import numpy as np
        
        mae = mean_absolute_error(actual_values, forecasted_values)
        mape = mean_absolute_percentage_error(actual_values, forecasted_values)
        rmse = np.sqrt(np.mean((np.array(forecasted_values) - np.array(actual_values)) ** 2))
        
        return {
            'mae': float(mae),
            'mape': float(mape),
            'rmse': float(rmse),
        }
    
    def detect_model_drift(self, current_metrics: dict, baseline_metrics: dict) -> bool:
        """Detect if model performance has degraded (drift)"""
        
        # Flag if any metric degrades >10%
        for metric in baseline_metrics:
            if metric in current_metrics:
                change = (current_metrics[metric] - baseline_metrics[metric]) / baseline_metrics[metric]
                if change < -0.10:  # >10% degradation
                    return True
        
        return False
```

---

## 7. Roadmap

**Weeks 1-3:** Setup & Data Pipeline
- [ ] Data pipeline from production PostgreSQL
- [ ] Feature engineering scripts
- [ ] Feature store setup (Feast)

**Weeks 4-6:** Predictive Models
- [ ] Performance forecasting model training
- [ ] Trend detection implementation
- [ ] Model validation and backtesting

**Weeks 7-9:** Recommendation Engine
- [ ] Collaborative filtering implementation
- [ ] Content-based recommendations
- [ ] A/B testing framework for recommendations

**Weeks 10-12:** Deployment & Integration
- [ ] FastAPI serving setup
- [ ] Integration with API gateway
- [ ] Monitoring dashboard
- [ ] Gradual rollout (5% → 50% → 100%)

---

**Document Version:** 1.0
**Last Updated:** 2024-07-31
**Owner:** ML Engineering Team
**Next Review:** 2024-10-31
