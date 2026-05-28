package main

import (
	"fmt"
	"log"
	"time"

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

	templateID := uint(2)

	err = seedExampleWorkflow(database, templateID)
	if err != nil {
		log.Fatal("Failed to seed example workflow:", err)
	}

	fmt.Println("✅ Example workflow data seeded successfully!")
}

func seedExampleWorkflow(db *gorm.DB, templateID uint) error {
	phases := []struct {
		Name          string
		Order         int
		ExecutionMode string
		Stages        []struct {
			Name          string
			Order         int
			ExecutionMode string
			Tasks         []struct {
				Name          string
				Order         int
				Department    string
				ExecutionMode string
				Operations    []struct {
					Name           string
					Order          int
					Description    string
					Guide          string
					TimeoutMinutes int
				}
			}
		}
	}{
		{
			Name:          "阶段2：数据备份",
			Order:         2,
			ExecutionMode: "serial",
			Stages: []struct {
				Name          string
				Order         int
				ExecutionMode string
				Tasks         []struct {
					Name          string
					Order         int
					Department    string
					ExecutionMode string
					Operations    []struct {
						Name           string
						Order          int
						Description    string
						Guide          string
						TimeoutMinutes int
					}
				}
			}{
				{
					Name:          "环节1：数据库备份",
					Order:         1,
					ExecutionMode: "serial",
					Tasks: []struct {
						Name          string
						Order         int
						Department    string
						ExecutionMode string
						Operations    []struct {
							Name           string
							Order          int
							Description    string
							Guide          string
							TimeoutMinutes int
						}
					}{
						{
							Name:          "任务1：备份MySQL数据库",
							Order:         1,
							Department:    "数据库运维组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：登录数据库服务器",
									Order:          1,
									Description:    "SSH登录到MySQL数据库服务器",
									Guide:          "①打开终端 → ②执行ssh user@db-server → ③输入密码登录",
									TimeoutMinutes: 5,
								},
								{
									Name:           "操作2：执行数据库备份",
									Order:          2,
									Description:    "使用mysqldump备份数据库",
									Guide:          "①执行mysqldump -u root -p dbname > backup.sql → ②确认备份文件生成",
									TimeoutMinutes: 30,
								},
								{
									Name:           "操作3：验证备份文件",
									Order:          3,
									Description:    "检查备份文件完整性和大小",
									Guide:          "①执行ls -lh backup.sql → ②检查文件大小是否合理 → ③执行head backup.sql查看内容",
									TimeoutMinutes: 10,
								},
							},
						},
						{
							Name:          "任务2：备份Redis数据",
							Order:         2,
							Department:    "数据库运维组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：登录Redis服务器",
									Order:          1,
									Description:    "SSH登录到Redis服务器",
									Guide:          "①打开终端 → ②执行ssh user@redis-server → ③输入密码登录",
									TimeoutMinutes: 5,
								},
								{
									Name:           "操作2：执行Redis备份",
									Order:          2,
									Description:    "使用redis-cli执行BGSAVE",
									Guide:          "①执行redis-cli BGSAVE → ②等待备份完成 → ③执行redis-cli LASTSAVE确认时间",
									TimeoutMinutes: 15,
								},
							},
						},
					},
				},
				{
					Name:          "环节2：文件备份",
					Order:         2,
					ExecutionMode: "parallel",
					Tasks: []struct {
						Name          string
						Order         int
						Department    string
						ExecutionMode string
						Operations    []struct {
							Name           string
							Order          int
							Description    string
							Guide          string
							TimeoutMinutes int
						}
					}{
						{
							Name:          "任务1：备份应用日志",
							Order:         1,
							Department:    "应用运维组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：打包日志文件",
									Order:          1,
									Description:    "打包应用服务器上的日志文件",
									Guide:          "①执行tar -czf logs-backup.tar.gz /var/log/app/ → ②确认打包文件生成",
									TimeoutMinutes: 20,
								},
								{
									Name:           "操作2：传输到备份服务器",
									Order:          2,
									Description:    "将日志备份传输到备份服务器",
									Guide:          "①执行scp logs-backup.tar.gz user@backup-server:/backup/ → ②确认传输完成",
									TimeoutMinutes: 15,
								},
							},
						},
						{
							Name:          "任务2：备份配置文件",
							Order:         2,
							Department:    "应用运维组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：打包配置文件",
									Order:          1,
									Description:    "打包应用配置文件",
									Guide:          "①执行tar -czf config-backup.tar.gz /etc/app/ → ②确认打包文件生成",
									TimeoutMinutes: 10,
								},
								{
									Name:           "操作2：传输到备份服务器",
									Order:          2,
									Description:    "将配置备份传输到备份服务器",
									Guide:          "①执行scp config-backup.tar.gz user@backup-server:/backup/ → ②确认传输完成",
									TimeoutMinutes: 10,
								},
							},
						},
					},
				},
			},
		},
		{
			Name:          "阶段3：系统恢复",
			Order:         3,
			ExecutionMode: "serial",
			Stages: []struct {
				Name          string
				Order         int
				ExecutionMode string
				Tasks         []struct {
					Name          string
					Order         int
					Department    string
					ExecutionMode string
					Operations    []struct {
						Name           string
						Order          int
						Description    string
						Guide          string
						TimeoutMinutes int
					}
				}
			}{
				{
					Name:          "环节1：服务恢复",
					Order:         1,
					ExecutionMode: "serial",
					Tasks: []struct {
						Name          string
						Order         int
						Department    string
						ExecutionMode string
						Operations    []struct {
							Name           string
							Order          int
							Description    string
							Guide          string
							TimeoutMinutes int
						}
					}{
						{
							Name:          "任务1：恢复Web服务",
							Order:         1,
							Department:    "应用运维组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：登录应用服务器",
									Order:          1,
									Description:    "SSH登录到应用服务器",
									Guide:          "①打开终端 → ②执行ssh user@app-server → ③输入密码登录",
									TimeoutMinutes: 5,
								},
								{
									Name:           "操作2：启动Web服务",
									Order:          2,
									Description:    "启动Web应用服务",
									Guide:          "①执行systemctl start web-service → ②执行systemctl status web-service确认状态",
									TimeoutMinutes: 10,
								},
								{
									Name:           "操作3：验证服务状态",
									Order:          3,
									Description:    "验证Web服务正常运行",
									Guide:          "①执行curl http://localhost:8080 → ②检查返回内容是否正常",
									TimeoutMinutes: 5,
								},
							},
						},
						{
							Name:          "任务2：恢复API服务",
							Order:         2,
							Department:    "应用运维组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：登录API服务器",
									Order:          1,
									Description:    "SSH登录到API服务器",
									Guide:          "①打开终端 → ②执行ssh user@api-server → ③输入密码登录",
									TimeoutMinutes: 5,
								},
								{
									Name:           "操作2：启动API服务",
									Order:          2,
									Description:    "启动API应用服务",
									Guide:          "①执行systemctl start api-service → ②执行systemctl status api-service确认状态",
									TimeoutMinutes: 10,
								},
								{
									Name:           "操作3：验证API状态",
									Order:          3,
									Description:    "验证API服务正常运行",
									Guide:          "①执行curl http://localhost:3000/api/health → ②检查返回内容是否正常",
									TimeoutMinutes: 5,
								},
							},
						},
					},
				},
				{
					Name:          "环节2：数据库恢复",
					Order:         2,
					ExecutionMode: "serial",
					Tasks: []struct {
						Name          string
						Order         int
						Department    string
						ExecutionMode string
						Operations    []struct {
							Name           string
							Order          int
							Description    string
							Guide          string
							TimeoutMinutes int
						}
					}{
						{
							Name:          "任务1：恢复MySQL数据库",
							Order:         1,
							Department:    "数据库运维组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：登录数据库服务器",
									Order:          1,
									Description:    "SSH登录到MySQL数据库服务器",
									Guide:          "①打开终端 → ②执行ssh user@db-server → ③输入密码登录",
									TimeoutMinutes: 5,
								},
								{
									Name:           "操作2：恢复数据库",
									Order:          2,
									Description:    "使用备份文件恢复数据库",
									Guide:          "①执行mysql -u root -p dbname < backup.sql → ②确认恢复完成",
									TimeoutMinutes: 30,
								},
								{
									Name:           "操作3：验证数据完整性",
									Order:          3,
									Description:    "检查数据库数据完整性",
									Guide:          "①执行mysql -u root -p -e 'SELECT COUNT(*) FROM users' → ②检查数据数量是否正确",
									TimeoutMinutes: 10,
								},
							},
						},
					},
				},
			},
		},
		{
			Name:          "阶段4：验证测试",
			Order:         4,
			ExecutionMode: "serial",
			Stages: []struct {
				Name          string
				Order         int
				ExecutionMode string
				Tasks         []struct {
					Name          string
					Order         int
					Department    string
					ExecutionMode string
					Operations    []struct {
						Name           string
						Order          int
						Description    string
						Guide          string
						TimeoutMinutes int
					}
				}
			}{
				{
					Name:          "环节1：功能验证",
					Order:         1,
					ExecutionMode: "parallel",
					Tasks: []struct {
						Name          string
						Order         int
						Department    string
						ExecutionMode string
						Operations    []struct {
							Name           string
							Order          int
							Description    string
							Guide          string
							TimeoutMinutes int
						}
					}{
						{
							Name:          "任务1：验证Web功能",
							Order:         1,
							Department:    "测试组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：访问Web首页",
									Order:          1,
									Description:    "访问Web应用首页",
									Guide:          "①打开浏览器 → ②访问http://web-server → ③检查页面是否正常显示",
									TimeoutMinutes: 5,
								},
								{
									Name:           "操作2：测试用户登录",
									Order:          2,
									Description:    "测试用户登录功能",
									Guide:          "①输入用户名和密码 → ②点击登录按钮 → ③检查是否成功登录",
									TimeoutMinutes: 10,
								},
								{
									Name:           "操作3：测试核心功能",
									Order:          3,
									Description:    "测试应用核心功能",
									Guide:          "①执行核心业务操作 → ②检查功能是否正常 → ③记录测试结果",
									TimeoutMinutes: 15,
								},
							},
						},
						{
							Name:          "任务2：验证API功能",
							Order:         2,
							Department:    "测试组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：测试API健康检查",
									Order:          1,
									Description:    "测试API健康检查接口",
									Guide:          "①执行curl http://api-server/api/health → ②检查返回状态是否正常",
									TimeoutMinutes: 5,
								},
								{
									Name:           "操作2：测试API核心接口",
									Order:          2,
									Description:    "测试API核心业务接口",
									Guide:          "①执行curl测试核心接口 → ②检查返回数据是否正确 → ③记录测试结果",
									TimeoutMinutes: 10,
								},
							},
						},
					},
				},
				{
					Name:          "环节2：性能验证",
					Order:         2,
					ExecutionMode: "serial",
					Tasks: []struct {
						Name          string
						Order         int
						Department    string
						ExecutionMode string
						Operations    []struct {
							Name           string
							Order          int
							Description    string
							Guide          string
							TimeoutMinutes int
						}
					}{
						{
							Name:          "任务1：性能测试",
							Order:         1,
							Department:    "测试组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：执行性能测试",
									Order:          1,
									Description:    "使用性能测试工具测试系统性能",
									Guide:          "①启动性能测试工具 → ②执行性能测试 → ③收集测试数据",
									TimeoutMinutes: 30,
								},
								{
									Name:           "操作2：分析性能数据",
									Order:          2,
									Description:    "分析性能测试结果",
									Guide:          "①查看性能测试报告 → ②分析响应时间和吞吐量 → ③确认性能达标",
									TimeoutMinutes: 15,
								},
							},
						},
					},
				},
				{
					Name:          "环节3：演练总结",
					Order:         3,
					ExecutionMode: "serial",
					Tasks: []struct {
						Name          string
						Order         int
						Department    string
						ExecutionMode string
						Operations    []struct {
							Name           string
							Order          int
							Description    string
							Guide          string
							TimeoutMinutes int
						}
					}{
						{
							Name:          "任务1：编写演练报告",
							Order:         1,
							Department:    "指挥组",
							ExecutionMode: "serial",
							Operations: []struct {
								Name           string
								Order          int
								Description    string
								Guide          string
								TimeoutMinutes int
							}{
								{
									Name:           "操作1：汇总演练数据",
									Order:          1,
									Description:    "汇总演练过程中的所有数据",
									Guide:          "①收集各环节执行时间 → ②收集问题记录 → ③整理测试结果",
									TimeoutMinutes: 20,
								},
								{
									Name:           "操作2：编写演练报告",
									Order:          2,
									Description:    "编写完整的演练报告",
									Guide:          "①填写演练基本信息 → ②记录演练过程 → ③总结问题和改进建议",
									TimeoutMinutes: 30,
								},
								{
									Name:           "操作3：提交演练报告",
									Order:          3,
									Description:    "提交演练报告给相关人员",
									Guide:          "①发送报告邮件 → ②通知相关人员查看 → ③确认报告已提交",
									TimeoutMinutes: 10,
								},
							},
						},
					},
				},
			},
		},
	}

	now := time.Now()

	for _, phaseData := range phases {
		phase := &model.Phase{
			TemplateID:    templateID,
			Name:          phaseData.Name,
			Order:         phaseData.Order,
			ExecutionMode: phaseData.ExecutionMode,
			Status:        "pending",
			CreatedAt:     now,
			UpdatedAt:     now,
		}

		if err := db.Create(phase).Error; err != nil {
			return fmt.Errorf("failed to create phase: %v", err)
		}

		fmt.Printf("✅ Created Phase: %s (ID: %d)\n", phase.Name, phase.ID)

		for _, stageData := range phaseData.Stages {
			stage := &model.Stage{
				PhaseID:       phase.ID,
				Name:          stageData.Name,
				Order:         stageData.Order,
				ExecutionMode: stageData.ExecutionMode,
				Status:        "pending",
				CreatedAt:     now,
				UpdatedAt:     now,
			}

			if err := db.Create(stage).Error; err != nil {
				return fmt.Errorf("failed to create stage: %v", err)
			}

			fmt.Printf("  ✅ Created Stage: %s (ID: %d)\n", stage.Name, stage.ID)

			for _, taskData := range stageData.Tasks {
				task := &model.Task{
					StageID:         stage.ID,
					Name:            taskData.Name,
					Order:           taskData.Order,
					Department:      taskData.Department,
					ExecutionMode:   taskData.ExecutionMode,
					Status:          "pending",
					EstimatedDuration: 0,
					CreatedAt:       now,
					UpdatedAt:       now,
				}

				if err := db.Create(task).Error; err != nil {
					return fmt.Errorf("failed to create task: %v", err)
				}

				fmt.Printf("    ✅ Created Task: %s (ID: %d, Department: %s)\n", task.Name, task.ID, task.Department)

				for _, operationData := range taskData.Operations {
					operation := &model.Operation{
						TaskID:         task.ID,
						Name:           operationData.Name,
						Order:          operationData.Order,
						Description:    operationData.Description,
						Guide:          operationData.Guide,
						TimeoutMinutes: operationData.TimeoutMinutes,
						ExecutionMode:  "serial",
						Status:         "pending",
						CreatedAt:      now,
						UpdatedAt:      now,
					}

					if err := db.Create(operation).Error; err != nil {
						return fmt.Errorf("failed to create operation: %v", err)
					}

					fmt.Printf("      ✅ Created Operation: %s (ID: %d, Timeout: %dmin)\n", operation.Name, operation.ID, operation.TimeoutMinutes)
				}
			}
		}
	}

	return nil
}