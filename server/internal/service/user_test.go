package service

import (
	"errors"
	"testing"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type mockUserRepo struct {
	users map[uint]*model.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{
		users: make(map[uint]*model.User),
	}
}

func (m *mockUserRepo) Create(user *model.User) error {
	user.ID = uint(len(m.users) + 1)
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) FindByID(id uint) (*model.User, error) {
	user, ok := m.users[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return user, nil
}

func (m *mockUserRepo) FindByUsername(username string) (*model.User, error) {
	for _, user := range m.users {
		if user.Username == username {
			return user, nil
		}
	}
	return nil, errors.New("not found")
}

func (m *mockUserRepo) List() ([]*model.User, error) {
	var users []*model.User
	for _, user := range m.users {
		users = append(users, user)
	}
	return users, nil
}

func (m *mockUserRepo) Update(user *model.User) error {
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) Delete(id uint) error {
	delete(m.users, id)
	return nil
}

func (m *mockUserRepo) ExistsByUsername(username string) (bool, error) {
	for _, user := range m.users {
		if user.Username == username {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockUserRepo) FindByIDs(ids []uint) ([]*model.User, error) {
	var users []*model.User
	for _, id := range ids {
		if user, ok := m.users[id]; ok {
			users = append(users, user)
		}
	}
	return users, nil
}

func (m *mockUserRepo) ValidatePassword(user *model.User, password string) bool {
	return password == "correct-password"
}

func TestCreateUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	user, err := svc.CreateUser("testuser", "password123", "Test User", "participant")
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if user.Username != "testuser" {
		t.Errorf("Expected username testuser, got %s", user.Username)
	}

	if user.Role != "participant" {
		t.Errorf("Expected role participant, got %s", user.Role)
	}
}

func TestCreateDuplicateUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	_, err := svc.CreateUser("testuser", "password123", "Test User", "participant")
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	_, err = svc.CreateUser("testuser", "password456", "Another User", "admin")
	if err == nil {
		t.Fatal("Should return error for duplicate username")
	}
}

func TestGetUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	created, _ := svc.CreateUser("testuser", "password123", "Test User", "participant")

	user, err := svc.GetUser(created.ID)
	if err != nil {
		t.Fatalf("Failed to get user: %v", err)
	}

	if user.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, user.ID)
	}
}

func TestListUsers(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	svc.CreateUser("user1", "pass1", "User 1", "admin")
	svc.CreateUser("user2", "pass2", "User 2", "participant")

	users, err := svc.ListUsers()
	if err != nil {
		t.Fatalf("Failed to list users: %v", err)
	}

	if len(users) != 2 {
		t.Errorf("Expected 2 users, got %d", len(users))
	}
}

func TestUpdateUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	user, _ := svc.CreateUser("testuser", "password123", "Test User", "participant")

	updated, err := svc.UpdateUser(user.ID, "newpassword", "Updated Name", "commander")
	if err != nil {
		t.Fatalf("Failed to update user: %v", err)
	}

	if updated.Name != "Updated Name" {
		t.Errorf("Expected name Updated Name, got %s", updated.Name)
	}

	if updated.Role != "commander" {
		t.Errorf("Expected role commander, got %s", updated.Role)
	}
}

func TestDeleteUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	user, _ := svc.CreateUser("testuser", "password123", "Test User", "participant")

	err := svc.DeleteUser(user.ID)
	if err != nil {
		t.Fatalf("Failed to delete user: %v", err)
	}

	_, err = svc.GetUser(user.ID)
	if err == nil {
		t.Fatal("User should be deleted")
	}
}