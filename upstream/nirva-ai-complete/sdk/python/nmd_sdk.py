"""
NMD SDK - Official Python Client
Simple, type-safe API for NMD Platform
"""

import json
import time
import hashlib
import hmac
from typing import Any, Dict, Optional, List
from urllib.parse import urlencode
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class NMDConfig:
    """Configuration for NMD Client"""
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.nmd.platform",
        timeout: int = 30000,
        retries: int = 3
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout // 1000  # Convert ms to seconds
        self.retries = retries


class NMDClient:
    """Official NMD Platform TypeScript Client"""
    
    def __init__(self, config: NMDConfig):
        self.config = config
        self.session = self._create_session()
        
        # Initialize API categories
        self.content = ContentAPI(self)
        self.templates = TemplatesAPI(self)
        self.metrics = MetricsAPI(self)
        self.analytics = AnalyticsAPI(self)
        self.search = SearchAPI(self)
        self.ai = AIAssistantAPI(self)
        self.webhooks = WebhooksAPI(self)
        self.health = HealthAPI(self)
    
    def _create_session(self) -> requests.Session:
        """Create requests session with retry strategy"""
        session = requests.Session()
        
        retry_strategy = Retry(
            total=self.config.retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "OPTIONS", "POST", "PUT", "DELETE"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def _request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        retry_count: int = 0
    ) -> Any:
        """Internal request handler with retry logic"""
        
        url = f"{self.config.base_url}{path}"
        
        # Build query parameters
        if params:
            filtered_params = {k: v for k, v in params.items() if v is not None}
            if filtered_params:
                url += f"?{urlencode(filtered_params)}"
        
        # Prepare headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.config.api_key}"
        }
        
        try:
            if method in ["POST", "PUT"]:
                response = self.session.request(
                    method,
                    url,
                    json=data,
                    headers=headers,
                    timeout=self.config.timeout
                )
            else:
                response = self.session.request(
                    method,
                    url,
                    headers=headers,
                    timeout=self.config.timeout
                )
            
            # Handle errors
            if not response.ok:
                if response.status_code >= 500 and retry_count < self.config.retries:
                    wait_time = (2 ** retry_count)
                    time.sleep(wait_time)
                    return self._request(method, path, data, params, retry_count + 1)
                
                raise Exception(f"HTTP {response.status_code}: {response.reason}")
            
            # Parse response
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                return response.json()
            
            return response.text
        
        except (requests.RequestException, Exception) as error:
            if retry_count < self.config.retries and "timeout" in str(error).lower():
                wait_time = (2 ** retry_count)
                time.sleep(wait_time)
                return self._request(method, path, data, params, retry_count + 1)
            
            raise Exception(f"NMD SDK Error: {str(error)}")


class ContentAPI:
    """Content Management API"""
    
    def __init__(self, client: NMDClient):
        self.client = client
    
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("POST", "/content", data)
    
    async def get(self, content_id: str) -> Dict[str, Any]:
        return self.client._request("GET", f"/content/{content_id}")
    
    async def list(
        self,
        organization_id: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        query_params = params or {}
        query_params["organizationId"] = organization_id
        return self.client._request("GET", "/content", params=query_params)
    
    async def update(self, content_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("PUT", f"/content/{content_id}", data)
    
    async def delete(self, content_id: str) -> Dict[str, Any]:
        return self.client._request("DELETE", f"/content/{content_id}")
    
    async def publish(self, content_id: str) -> Dict[str, Any]:
        return self.client._request("POST", f"/content/{content_id}/publish", {})
    
    async def archive(self, content_id: str) -> Dict[str, Any]:
        return self.client._request("POST", f"/content/{content_id}/archive", {})


class TemplatesAPI:
    """Templates Management API"""
    
    def __init__(self, client: NMDClient):
        self.client = client
    
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("POST", "/templates", data)
    
    async def get(self, template_id: str) -> Dict[str, Any]:
        return self.client._request("GET", f"/templates/{template_id}")
    
    async def list(self, organization_id: str) -> Dict[str, Any]:
        return self.client._request(
            "GET",
            "/templates",
            params={"organizationId": organization_id}
        )
    
    async def update(self, template_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("PUT", f"/templates/{template_id}", data)


class MetricsAPI:
    """Metrics API"""
    
    def __init__(self, client: NMDClient):
        self.client = client
    
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("POST", "/metrics", data)
    
    async def record(self, metric_id: str, value: float) -> Dict[str, Any]:
        return self.client._request(
            "POST",
            f"/metrics/{metric_id}/record",
            {"value": value}
        )
    
    async def get_readings(
        self,
        metric_id: str,
        limit: int = 100
    ) -> Dict[str, Any]:
        return self.client._request(
            "GET",
            f"/metrics/{metric_id}/readings",
            params={"limit": limit}
        )
    
    async def get_stats(self, metric_id: str, period: str) -> Dict[str, Any]:
        return self.client._request(
            "GET",
            f"/metrics/{metric_id}/stats",
            params={"period": period}
        )


class AnalyticsAPI:
    """Analytics API"""
    
    def __init__(self, client: NMDClient):
        self.client = client
    
    async def get_dashboard(self, organization_id: str) -> Dict[str, Any]:
        return self.client._request(
            "GET",
            "/analytics/dashboard",
            params={"organizationId": organization_id}
        )
    
    async def get_metrics(
        self,
        organization_id: str,
        period: str
    ) -> Dict[str, Any]:
        return self.client._request(
            "GET",
            "/analytics/metrics",
            params={"organizationId": organization_id, "period": period}
        )
    
    async def get_trends(
        self,
        organization_id: str,
        metric: str
    ) -> Dict[str, Any]:
        return self.client._request(
            "GET",
            "/analytics/trends",
            params={"organizationId": organization_id, "metric": metric}
        )
    
    async def get_report(
        self,
        organization_id: str,
        report_id: str
    ) -> Dict[str, Any]:
        return self.client._request(
            "GET",
            f"/analytics/reports/{report_id}",
            params={"organizationId": organization_id}
        )


class SearchAPI:
    """Search API"""
    
    def __init__(self, client: NMDClient):
        self.client = client
    
    async def query(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("POST", "/search", data)
    
    async def suggest(self, q: str, organization_id: str) -> List[str]:
        return self.client._request(
            "GET",
            "/search/suggest",
            params={"q": q, "organizationId": organization_id}
        )
    
    async def facets(self, field: str, organization_id: str) -> Dict[str, Any]:
        return self.client._request(
            "GET",
            "/search/facets",
            params={"field": field, "organizationId": organization_id}
        )


class AIAssistantAPI:
    """AI Assistant API"""
    
    def __init__(self, client: NMDClient):
        self.client = client
    
    async def generate_content(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("POST", "/ai/generate", data)
    
    async def optimize_content(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("POST", "/ai/optimize", data)
    
    async def suggest_titles(self, data: Dict[str, Any]) -> List[str]:
        return self.client._request("POST", "/ai/suggest-titles", data)


class WebhooksAPI:
    """Webhooks API"""
    
    def __init__(self, client: NMDClient):
        self.client = client
    
    async def subscribe(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client._request("POST", "/webhooks/subscribe", data)
    
    async def list(self, organization_id: str) -> List[Dict[str, Any]]:
        return self.client._request(
            "GET",
            "/webhooks",
            params={"organizationId": organization_id}
        )
    
    async def unsubscribe(self, webhook_id: str) -> Dict[str, Any]:
        return self.client._request(
            "DELETE",
            f"/webhooks/{webhook_id}",
            {}
        )
    
    async def test(self, webhook_id: str) -> Dict[str, Any]:
        return self.client._request(
            "POST",
            f"/webhooks/{webhook_id}/test",
            {}
        )


class HealthAPI:
    """Health Check API"""
    
    def __init__(self, client: NMDClient):
        self.client = client
    
    async def status(self) -> Dict[str, Any]:
        return self.client._request("GET", "/health", {})
    
    async def ready(self) -> Dict[str, Any]:
        return self.client._request("GET", "/health/ready", {})
    
    async def metrics(self) -> Dict[str, Any]:
        return self.client._request("GET", "/metrics/health", {})


class NMDBatchClient:
    """Batch operations helper"""
    
    def __init__(self, client: NMDClient):
        self.client = client
        self.batch: List[Any] = []
    
    def add(self, operation: callable) -> "NMDBatchClient":
        """Add operation to batch"""
        self.batch.append(operation)
        return self
    
    async def execute(self) -> List[Any]:
        """Execute all operations in batch"""
        results = []
        for operation in self.batch:
            try:
                result = await operation()
                results.append(result)
            except Exception as e:
                results.append(None)
        return results
    
    def reset(self) -> "NMDBatchClient":
        """Reset batch"""
        self.batch = []
        return self
