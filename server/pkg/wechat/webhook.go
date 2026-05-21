package wechat

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type WebhookClient struct {
	webhookURL string
	httpClient *http.Client
}

func NewWebhookClient(webhookURL string) *WebhookClient {
	return &WebhookClient{
		webhookURL: webhookURL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type MarkdownMessage struct {
	MsgType  string `json:"msgtype"`
	Markdown struct {
		Content string `json:"content"`
	} `json:"markdown"`
}

func (c *WebhookClient) SendMarkdownMessage(content string) error {
	if c.webhookURL == "" {
		return fmt.Errorf("webhook URL is not configured")
	}

	msg := MarkdownMessage{
		MsgType: "markdown",
	}
	msg.Markdown.Content = content

	body, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Post(c.webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("webhook request failed with status: %d", resp.StatusCode)
	}

	return nil
}

func (c *WebhookClient) UpdateWebhookURL(url string) {
	c.webhookURL = url
}

func (c *WebhookClient) GetWebhookURL() string {
	return c.webhookURL
}