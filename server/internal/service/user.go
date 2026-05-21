package service

import (
	"errors"

	"golang.org/x/crypto/bcrypt"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

func (s *UserService) CreateUser(username, password, name, role string) (*model.User, error) {
	exists, err := s.userRepo.ExistsByUsername(username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("username already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Username:     username,
		PasswordHash: string(hashedPassword),
		Name:         name,
		Role:         role,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) GetUser(id uint) (*model.User, error) {
	return s.userRepo.FindByID(id)
}

func (s *UserService) ListUsers() ([]*model.User, error) {
	return s.userRepo.List()
}

func (s *UserService) UpdateUser(id uint, password, name, role string) (*model.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = string(hashedPassword)
	}

	if name != "" {
		user.Name = name
	}

	if role != "" {
		user.Role = role
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) DeleteUser(id uint) error {
	return s.userRepo.Delete(id)
}

func (s *UserService) ValidateUser(username, password string) (*model.User, error) {
	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if !s.userRepo.ValidatePassword(user, password) {
		return nil, errors.New("invalid username or password")
	}

	return user, nil
}

func (s *UserService) GetUsersByIDs(ids []uint) ([]*model.User, error) {
	return s.userRepo.FindByIDs(ids)
}