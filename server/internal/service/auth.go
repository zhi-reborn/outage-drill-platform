package service

import (
	"errors"

	"github.com/yourorg/outage-drill-platform/server/internal/repository"
	"github.com/yourorg/outage-drill-platform/server/pkg/auth"
)

type AuthService struct {
	userRepo    *repository.UserRepository
	jwtSecret   string
	expireHours int
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string, expireHours int) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		jwtSecret:   jwtSecret,
		expireHours: expireHours,
	}
}

func (s *AuthService) Login(username, password string) (string, error) {
	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return "", errors.New("invalid username or password")
	}

	if !s.userRepo.ValidatePassword(user, password) {
		return "", errors.New("invalid username or password")
	}

	token, err := auth.GenerateToken(s.jwtSecret, user.ID, user.Username, user.Role, s.expireHours)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *AuthService) ValidateToken(tokenString string) (*auth.Claims, error) {
	return auth.ParseToken(s.jwtSecret, tokenString)
}