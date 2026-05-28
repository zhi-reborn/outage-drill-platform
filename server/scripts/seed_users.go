package main

import (
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/pkg/config"
	"github.com/yourorg/outage-drill-platform/server/pkg/db"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	database, err := db.NewMySQL(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	users := []struct {
		Username string
		Password string
		Name     string
		Role     string
	}{
		{"zhangsan", "123456", "张三", "participant"},
		{"lisi", "123456", "李四", "participant"},
		{"wangwu", "123456", "王五", "participant"},
		{"zhaoliu", "123456", "赵六", "participant"},
		{"sunqi", "123456", "孙七", "participant"},
		{"zhouba", "123456", "周八", "participant"},
		{"wujiu", "123456", "吴九", "participant"},
		{"zhengshi", "123456", "郑十", "participant"},
		{"chenwei", "123456", "陈伟", "participant"},
		{"liufang", "123456", "刘芳", "participant"},
	}

	err = seedUsers(database, users)
	if err != nil {
		log.Fatal("Failed to seed users:", err)
	}

	fmt.Println("Users seeded successfully!")
}

func seedUsers(database *gorm.DB, users []struct {
	Username string
	Password string
	Name     string
	Role     string
}) error {
	for _, u := range users {
		var count int64
		database.Model(&model.User{}).Where("username = ?", u.Username).Count(&count)
		if count > 0 {
			fmt.Printf("User %s already exists, skipping\n", u.Username)
			continue
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("failed to hash password for %s: %v", u.Username, err)
		}

		user := &model.User{
			Username:     u.Username,
			PasswordHash: string(hashedPassword),
			Name:         u.Name,
			Role:         u.Role,
		}

		if err := database.Create(user).Error; err != nil {
			return fmt.Errorf("failed to create user %s: %v", u.Username, err)
		}

		fmt.Printf("Created user: %s (%s) - password: %s\n", u.Name, u.Username, u.Password)
	}

	return nil
}
