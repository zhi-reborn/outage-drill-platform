package service

import (
	"testing"
)

func TestLogin(t *testing.T) {
	userRepo := newMockUserRepo()
	userSvc := NewUserService(userRepo)
	authSvc := NewAuthService(userRepo, "test-secret", 24)

	userSvc.CreateUser("testuser", "correct-password", "Test User", "participant")

	token, err := authSvc.Login("testuser", "correct-password")
	if err != nil {
		t.Fatalf("Failed to login: %v", err)
	}

	if token == "" {
		t.Fatal("Token should not be empty")
	}
}

func TestLoginWithWrongPassword(t *testing.T) {
	userRepo := newMockUserRepo()
	userSvc := NewUserService(userRepo)
	authSvc := NewAuthService(userRepo, "test-secret", 24)

	userSvc.CreateUser("testuser", "correct-password", "Test User", "participant")

	_, err := authSvc.Login("testuser", "wrongpassword")
	if err == nil {
		t.Fatal("Should return error for wrong password")
	}
}

func TestValidateToken(t *testing.T) {
	userRepo := newMockUserRepo()
	userSvc := NewUserService(userRepo)
	authSvc := NewAuthService(userRepo, "test-secret", 24)

	user, _ := userSvc.CreateUser("testuser", "correct-password", "Test User", "participant")
	token, _ := authSvc.Login("testuser", "correct-password")

	claims, err := authSvc.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("Expected userID %d, got %d", user.ID, claims.UserID)
	}
}