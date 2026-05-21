package auth

import (
	"testing"
	"time"
)

func TestGenerateAndParseToken(t *testing.T) {
	secret := "test-secret-key"
	userID := uint(1)
	username := "testuser"
	role := "admin"
	expireHours := 24

	token, err := GenerateToken(secret, userID, username, role, expireHours)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token == "" {
		t.Fatal("Token should not be empty")
	}

	claims, err := ParseToken(secret, token)
	if err != nil {
		t.Fatalf("Failed to parse token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected userID %d, got %d", userID, claims.UserID)
	}

	if claims.Username != username {
		t.Errorf("Expected username %s, got %s", username, claims.Username)
	}

	if claims.Role != role {
		t.Errorf("Expected role %s, got %s", role, claims.Role)
	}
}

func TestParseInvalidToken(t *testing.T) {
	secret := "test-secret-key"
	invalidToken := "invalid.token.here"

	_, err := ParseToken(secret, invalidToken)
	if err == nil {
		t.Fatal("Should return error for invalid token")
	}
}

func TestTokenExpiration(t *testing.T) {
	secret := "test-secret-key"
	userID := uint(1)
	username := "testuser"
	role := "admin"
	expireHours := 0

	token, err := GenerateToken(secret, userID, username, role, expireHours)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	time.Sleep(2 * time.Second)

	_, err = ParseToken(secret, token)
	if err == nil {
		t.Fatal("Should return error for expired token")
	}
}