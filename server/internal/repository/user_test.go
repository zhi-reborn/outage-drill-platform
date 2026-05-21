package repository

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	err = db.AutoMigrate(&model.User{})
	if err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	return db
}

func TestCreateUser(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &model.User{
		Username:     "testuser",
		PasswordHash: hashPassword("password123"),
		Name:         "Test User",
		Role:         "participant",
	}

	err := repo.Create(user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if user.ID == 0 {
		t.Fatal("User ID should not be zero after creation")
	}
}

func TestFindByUsername(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &model.User{
		Username:     "testuser",
		PasswordHash: hashPassword("password123"),
		Name:         "Test User",
		Role:         "participant",
	}
	repo.Create(user)

	found, err := repo.FindByUsername("testuser")
	if err != nil {
		t.Fatalf("Failed to find user: %v", err)
	}

	if found.Username != "testuser" {
		t.Errorf("Expected username testuser, got %s", found.Username)
	}
}

func TestFindByID(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &model.User{
		Username:     "testuser",
		PasswordHash: hashPassword("password123"),
		Name:         "Test User",
		Role:         "participant",
	}
	repo.Create(user)

	found, err := repo.FindByID(user.ID)
	if err != nil {
		t.Fatalf("Failed to find user: %v", err)
	}

	if found.ID != user.ID {
		t.Errorf("Expected ID %d, got %d", user.ID, found.ID)
	}
}

func TestList(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	users := []*model.User{
		{Username: "user1", PasswordHash: "hash1", Name: "User 1", Role: "admin"},
		{Username: "user2", PasswordHash: "hash2", Name: "User 2", Role: "participant"},
		{Username: "user3", PasswordHash: "hash3", Name: "User 3", Role: "commander"},
	}

	for _, u := range users {
		repo.Create(u)
	}

	list, err := repo.List()
	if err != nil {
		t.Fatalf("Failed to list users: %v", err)
	}

	if len(list) != 3 {
		t.Errorf("Expected 3 users, got %d", len(list))
	}
}

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes)
}