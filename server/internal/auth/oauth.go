package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// OAuthProvider represents a generic OAuth 2.0 provider
type OAuthProvider struct {
	Name         string
	ClientID     string
	ClientSecret string
	AuthURL      string
	TokenURL     string
	UserInfoURL  string
	RedirectURL  string
	Scopes       []string
}

type OAuthToken struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
}

type OAuthUserInfo struct {
	ID       string
	Email    string
	Nickname string
}

func NewGoogleProvider(clientID, clientSecret, redirectURL string) *OAuthProvider {
	return &OAuthProvider{
		Name:         "google",
		ClientID:     clientID,
		ClientSecret: clientSecret,
		AuthURL:      "https://accounts.google.com/o/oauth2/v2/auth",
		TokenURL:     "https://oauth2.googleapis.com/token",
		UserInfoURL:  "https://www.googleapis.com/oauth2/v2/userinfo",
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "email", "profile"},
	}
}

func NewKakaoProvider(clientID, clientSecret, redirectURL string) *OAuthProvider {
	return &OAuthProvider{
		Name:         "kakao",
		ClientID:     clientID,
		ClientSecret: clientSecret,
		AuthURL:      "https://kauth.kakao.com/oauth/authorize",
		TokenURL:     "https://kauth.kakao.com/oauth/token",
		UserInfoURL:  "https://kapi.kakao.com/v2/user/me",
		RedirectURL:  redirectURL,
		Scopes:       []string{"profile_nickname"},
	}
}

// GetAuthURL returns the OAuth authorization URL
func (p *OAuthProvider) GetAuthURL(state string) string {
	params := url.Values{
		"client_id":     {p.ClientID},
		"redirect_uri":  {p.RedirectURL},
		"response_type": {"code"},
		"scope":         {strings.Join(p.Scopes, " ")},
		"state":         {state},
	}
	return p.AuthURL + "?" + params.Encode()
}

// ExchangeCode exchanges an authorization code for an access token
func (p *OAuthProvider) ExchangeCode(ctx context.Context, code string) (*OAuthToken, error) {
	data := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {p.RedirectURL},
		"client_id":     {p.ClientID},
		"client_secret": {p.ClientSecret},
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.TokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token exchange failed: %s", string(body))
	}

	var token OAuthToken
	if err := json.Unmarshal(body, &token); err != nil {
		return nil, err
	}
	return &token, nil
}

// GetUserInfo fetches the user's profile from the provider
func (p *OAuthProvider) GetUserInfo(ctx context.Context, accessToken string) (*OAuthUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", p.UserInfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("user info request failed: %s", string(body))
	}

	switch p.Name {
	case "google":
		return parseGoogleUserInfo(body)
	case "kakao":
		return parseKakaoUserInfo(body)
	default:
		return nil, fmt.Errorf("unknown provider: %s", p.Name)
	}
}

func parseGoogleUserInfo(body []byte) (*OAuthUserInfo, error) {
	var data struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}
	return &OAuthUserInfo{
		ID:       data.ID,
		Email:    data.Email,
		Nickname: data.Name,
	}, nil
}

func parseKakaoUserInfo(body []byte) (*OAuthUserInfo, error) {
	var data struct {
		ID         int64 `json:"id"`
		Properties struct {
			Nickname string `json:"nickname"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}
	return &OAuthUserInfo{
		ID:       fmt.Sprintf("%d", data.ID),
		Nickname: data.Properties.Nickname,
	}, nil
}
