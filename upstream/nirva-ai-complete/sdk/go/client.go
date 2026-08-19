// NMD SDK - Official Go Client
package nmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"time"
)

// Config holds the NMD client configuration
type Config struct {
	APIKey   string
	BaseURL  string
	Timeout  time.Duration
	Retries  int
}

// Client is the NMD Platform client
type Client struct {
	config    *Config
	httpClient *http.Client
	
	Content    *ContentAPI
	Templates  *TemplatesAPI
	Metrics    *MetricsAPI
	Analytics  *AnalyticsAPI
	Search     *SearchAPI
	AI         *AIAssistantAPI
	Webhooks   *WebhooksAPI
	Health     *HealthAPI
}

// NewClient creates a new NMD client
func NewClient(config *Config) *Client {
	if config.BaseURL == "" {
		config.BaseURL = "https://api.nmd.platform"
	}
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}
	if config.Retries == 0 {
		config.Retries = 3
	}
	
	httpClient := &http.Client{
		Timeout: config.Timeout,
	}
	
	client := &Client{
		config:     config,
		httpClient: httpClient,
	}
	
	// Initialize API categories
	client.Content = &ContentAPI{client: client}
	client.Templates = &TemplatesAPI{client: client}
	client.Metrics = &MetricsAPI{client: client}
	client.Analytics = &AnalyticsAPI{client: client}
	client.Search = &SearchAPI{client: client}
	client.AI = &AIAssistantAPI{client: client}
	client.Webhooks = &WebhooksAPI{client: client}
	client.Health = &HealthAPI{client: client}
	
	return client
}

// request performs an HTTP request with retry logic
func (c *Client) request(
	method string,
	path string,
	data interface{},
	params map[string]interface{},
	retryCount int,
) ([]byte, error) {
	
	fullURL := c.config.BaseURL + path
	
	// Add query parameters
	if len(params) > 0 {
		q := url.Values{}
		for k, v := range params {
			if v != nil {
				q.Add(k, fmt.Sprintf("%v", v))
			}
		}
		fullURL += "?" + q.Encode()
	}
	
	// Prepare body
	var body io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, err
		}
		body = bytes.NewBuffer(jsonData)
	}
	
	// Create request
	req, err := http.NewRequest(method, fullURL, body)
	if err != nil {
		return nil, err
	}
	
	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.config.APIKey))
	
	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		if retryCount < c.config.Retries && isRetryableError(err) {
			wait := time.Duration(math.Pow(2, float64(retryCount))) * time.Second
			time.Sleep(wait)
			return c.request(method, path, data, params, retryCount+1)
		}
		return nil, fmt.Errorf("NMD SDK Error: %w", err)
	}
	defer resp.Body.Close()
	
	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	// Handle errors
	if resp.StatusCode >= 400 {
		if resp.StatusCode >= 500 && retryCount < c.config.Retries {
			wait := time.Duration(math.Pow(2, float64(retryCount))) * time.Second
			time.Sleep(wait)
			return c.request(method, path, data, params, retryCount+1)
		}
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}
	
	return respBody, nil
}

func isRetryableError(err error) bool {
	// Check for timeout or network errors
	return err == context.DeadlineExceeded || 
		   (err != nil && err.Timeout())
}

// ContentAPI handles content operations
type ContentAPI struct {
	client *Client
}

// Create creates new content
func (api *ContentAPI) Create(data map[string]interface{}) (map[string]interface{}, error) {
	resp, err := api.client.request("POST", "/content", data, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Get retrieves content by ID
func (api *ContentAPI) Get(contentID string) (map[string]interface{}, error) {
	resp, err := api.client.request("GET", "/content/"+contentID, nil, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// List retrieves content list
func (api *ContentAPI) List(organizationID string, params map[string]interface{}) (map[string]interface{}, error) {
	if params == nil {
		params = make(map[string]interface{})
	}
	params["organizationId"] = organizationID
	
	resp, err := api.client.request("GET", "/content", nil, params, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Update updates content
func (api *ContentAPI) Update(contentID string, data map[string]interface{}) (map[string]interface{}, error) {
	resp, err := api.client.request("PUT", "/content/"+contentID, data, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Delete deletes content
func (api *ContentAPI) Delete(contentID string) error {
	_, err := api.client.request("DELETE", "/content/"+contentID, nil, nil, 0)
	return err
}

// Publish publishes content
func (api *ContentAPI) Publish(contentID string) (map[string]interface{}, error) {
	resp, err := api.client.request("POST", "/content/"+contentID+"/publish", make(map[string]interface{}), nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Archive archives content
func (api *ContentAPI) Archive(contentID string) (map[string]interface{}, error) {
	resp, err := api.client.request("POST", "/content/"+contentID+"/archive", make(map[string]interface{}), nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// TemplatesAPI handles template operations
type TemplatesAPI struct {
	client *Client
}

// Create creates new template
func (api *TemplatesAPI) Create(data map[string]interface{}) (map[string]interface{}, error) {
	resp, err := api.client.request("POST", "/templates", data, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Get retrieves template by ID
func (api *TemplatesAPI) Get(templateID string) (map[string]interface{}, error) {
	resp, err := api.client.request("GET", "/templates/"+templateID, nil, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// List retrieves templates
func (api *TemplatesAPI) List(organizationID string) ([]map[string]interface{}, error) {
	params := map[string]interface{}{"organizationId": organizationID}
	resp, err := api.client.request("GET", "/templates", nil, params, 0)
	if err != nil {
		return nil, err
	}
	
	var result []map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Update updates template
func (api *TemplatesAPI) Update(templateID string, data map[string]interface{}) (map[string]interface{}, error) {
	resp, err := api.client.request("PUT", "/templates/"+templateID, data, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// MetricsAPI, AnalyticsAPI, SearchAPI, AIAssistantAPI, WebhooksAPI, HealthAPI
// (Similar implementations for other APIs)

type MetricsAPI struct {
	client *Client
}

type AnalyticsAPI struct {
	client *Client
}

type SearchAPI struct {
	client *Client
}

type AIAssistantAPI struct {
	client *Client
}

type WebhooksAPI struct {
	client *Client
}

type HealthAPI struct {
	client *Client
}

// Status checks API health
func (api *HealthAPI) Status() (map[string]interface{}, error) {
	resp, err := api.client.request("GET", "/health", nil, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Ready checks if API is ready
func (api *HealthAPI) Ready() (map[string]interface{}, error) {
	resp, err := api.client.request("GET", "/health/ready", nil, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Metrics retrieves health metrics
func (api *HealthAPI) Metrics() (map[string]interface{}, error) {
	resp, err := api.client.request("GET", "/metrics/health", nil, nil, 0)
	if err != nil {
		return nil, err
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}
	return result, nil
}
