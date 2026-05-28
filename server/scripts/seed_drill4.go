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

	templateID, err := createTemplate(database)
	if err != nil {
		log.Fatal("Failed to create template:", err)
	}

	fmt.Printf("Template ID: %d\n", templateID)

	err = seedDrill4(database, templateID)
	if err != nil {
		log.Fatal("Failed to seed drill4:", err)
	}

	fmt.Println("Drill4 workflow data seeded successfully!")
}

func createTemplate(db *gorm.DB) (uint, error) {
	tmpl := &model.DrillTemplate{
		Name:        "金融演练4",
		Description: "金融系统综合容灾演练，覆盖故障发现、应急响应、系统降级、数据切换、业务恢复、功能验证、根因分析、总结归档全流程",
	}
	if err := db.Create(tmpl).Error; err != nil {
		return 0, fmt.Errorf("failed to create template: %v", err)
	}
	fmt.Printf("Created Template: %s (ID: %d)\n", tmpl.Name, tmpl.ID)
	return tmpl.ID, nil
}

func seedDrill4(database *gorm.DB, templateID uint) error {
	type OpDef struct {
		Name           string
		Order          int
		Description    string
		Guide          string
		TimeoutMinutes int
	}
	type TaskDef struct {
		Name       string
		Order      int
		Department string
		Operations []OpDef
	}
	type StageDef struct {
		Name  string
		Order int
		Mode  string
		Tasks []TaskDef
	}
	type PhaseDef struct {
		Name   string
		Order  int
		Mode   string
		Stages []StageDef
	}

	phases := []PhaseDef{
		{
			Name:  "阶段1：故障发现与告警",
			Order: 1,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：监控告警",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：监控巡检",
							Order:      1,
							Department: "监控中心",
							Operations: []OpDef{
								{Name: "操作1：检查监控大盘", Order: 1, Description: "检查各系统监控指标是否正常", Guide: "1.登录监控平台 2.查看核心指标 3.确认告警状态", TimeoutMinutes: 5},
								{Name: "操作2：确认异常指标", Order: 2, Description: "确认异常指标和告警级别", Guide: "1.识别异常指标 2.评估影响范围 3.确定告警级别", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：告警通知",
							Order:      2,
							Department: "监控中心",
							Operations: []OpDef{
								{Name: "操作1：发送告警通知", Order: 1, Description: "向相关人员发送告警通知", Guide: "1.确定通知对象 2.发送告警短信/邮件 3.确认通知送达", TimeoutMinutes: 3},
								{Name: "操作2：升级告警级别", Order: 2, Description: "根据情况升级告警级别", Guide: "1.评估告警严重程度 2.升级告警级别 3.通知上级领导", TimeoutMinutes: 5},
								{Name: "操作3：记录告警日志", Order: 3, Description: "记录告警信息和处理过程", Guide: "1.记录告警时间 2.记录告警内容 3.记录处理人员", TimeoutMinutes: 3},
							},
						},
					},
				},
				{
					Name:  "环节2：故障确认",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：一线排查",
							Order:      1,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：检查网络连通性", Order: 1, Description: "检查核心网络连通性", Guide: "1.ping核心服务器 2.检查网络延迟 3.确认网络状态", TimeoutMinutes: 5},
								{Name: "操作2：检查服务状态", Order: 2, Description: "检查核心服务运行状态", Guide: "1.检查服务进程 2.检查服务端口 3.确认服务状态", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：故障定位",
							Order:      2,
							Department: "技术支持组",
							Operations: []OpDef{
								{Name: "操作1：分析日志信息", Order: 1, Description: "分析系统日志定位故障原因", Guide: "1.收集系统日志 2.分析异常日志 3.定位故障点", TimeoutMinutes: 10},
								{Name: "操作2：确认故障类型", Order: 2, Description: "确认故障类型和影响范围", Guide: "1.判断故障类型 2.评估影响范围 3.确定故障等级", TimeoutMinutes: 5},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段2：应急响应启动",
			Order: 2,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：应急启动",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：启动应急流程",
							Order:      1,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：召集应急团队", Order: 1, Description: "通知应急响应团队成员", Guide: "1.拨打应急电话 2.发送应急短信 3.开启应急群聊", TimeoutMinutes: 5},
								{Name: "操作2：召开应急会议", Order: 2, Description: "召开应急响应会议", Guide: "1.创建会议 2.通知参会人员 3.开始会议", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：分配应急任务",
							Order:      2,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：分配任务", Order: 1, Description: "向各团队分配应急任务", Guide: "1.确定任务清单 2.分配责任人 3.确认任务接收", TimeoutMinutes: 5},
								{Name: "操作2：建立沟通机制", Order: 2, Description: "建立应急沟通机制", Guide: "1.建立应急群组 2.确定汇报机制 3.确定沟通频率", TimeoutMinutes: 3},
							},
						},
					},
				},
				{
					Name:  "环节2：信息通报",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：内部通报",
							Order:      1,
							Department: "综合管理组",
							Operations: []OpDef{
								{Name: "操作1：编写通报内容", Order: 1, Description: "编写故障通报内容", Guide: "1.说明故障情况 2.说明影响范围 3.说明应对措施", TimeoutMinutes: 5},
								{Name: "操作2：发送内部通报", Order: 2, Description: "发送内部通报", Guide: "1.发送邮件通报 2.更新状态页面 3.通知相关部门", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：外部通报",
							Order:      2,
							Department: "客户服务组",
							Operations: []OpDef{
								{Name: "操作1：评估客户影响", Order: 1, Description: "评估对客户的影响程度", Guide: "1.识别受影响客户 2.评估影响程度 3.确定通报范围", TimeoutMinutes: 5},
								{Name: "操作2：通知客户", Order: 2, Description: "通知受影响客户", Guide: "1.编写客户通知 2.发送客户通知 3.确认通知送达", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节3：决策审批",
					Order: 3,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：方案评估",
							Order:      1,
							Department: "技术专家组",
							Operations: []OpDef{
								{Name: "操作1：评估应对方案", Order: 1, Description: "评估各种应对方案", Guide: "1.列出可选方案 2.评估方案优劣 3.推荐最优方案", TimeoutMinutes: 10},
								{Name: "操作2：制定执行计划", Order: 2, Description: "制定详细执行计划", Guide: "1.确定执行步骤 2.确定时间节点 3.确定责任人", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：领导审批",
							Order:      2,
							Department: "决策层",
							Operations: []OpDef{
								{Name: "操作1：汇报方案", Order: 1, Description: "向领导汇报应对方案", Guide: "1.准备汇报材料 2.汇报方案内容 3.回答领导提问", TimeoutMinutes: 10},
								{Name: "操作2：获得审批", Order: 2, Description: "获得领导审批", Guide: "1.等待领导决策 2.记录审批意见 3.确认审批结果", TimeoutMinutes: 5},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段3：系统降级处理",
			Order: 3,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：服务降级",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：核心服务降级",
							Order:      1,
							Department: "应用运维组",
							Operations: []OpDef{
								{Name: "操作1：关闭非核心功能", Order: 1, Description: "关闭非核心业务功能", Guide: "1.识别非核心功能 2.关闭功能开关 3.确认关闭状态", TimeoutMinutes: 5},
								{Name: "操作2：调整服务参数", Order: 2, Description: "调整服务运行参数", Guide: "1.调整超时参数 2.调整重试次数 3.确认参数生效", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：流量控制",
							Order:      2,
							Department: "网关组",
							Operations: []OpDef{
								{Name: "操作1：限流配置", Order: 1, Description: "配置流量限流规则", Guide: "1.确定限流阈值 2.配置限流规则 3.确认规则生效", TimeoutMinutes: 5},
								{Name: "操作2：熔断配置", Order: 2, Description: "配置服务熔断规则", Guide: "1.确定熔断条件 2.配置熔断规则 3.确认熔断生效", TimeoutMinutes: 5},
								{Name: "操作3：降级页面配置", Order: 3, Description: "配置服务降级页面", Guide: "1.准备降级页面 2.配置降级跳转 3.验证降级页面", TimeoutMinutes: 5},
							},
						},
					},
				},
				{
					Name:  "环节2：数据库降级",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：读写分离调整",
							Order:      1,
							Department: "数据库组",
							Operations: []OpDef{
								{Name: "操作1：调整读流量", Order: 1, Description: "将读流量切换到从库", Guide: "1.修改数据源配置 2.重启应用服务 3.验证读流量走向", TimeoutMinutes: 10},
								{Name: "操作2：验证数据同步", Order: 2, Description: "验证主从数据同步状态", Guide: "1.检查同步延迟 2.检查数据一致性 3.确认同步正常", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：缓存策略调整",
							Order:      2,
							Department: "中间件组",
							Operations: []OpDef{
								{Name: "操作1：延长缓存时间", Order: 1, Description: "延长缓存过期时间", Guide: "1.调整缓存TTL 2.重启缓存服务 3.验证缓存生效", TimeoutMinutes: 5},
								{Name: "操作2：预热核心缓存", Order: 2, Description: "预热核心业务缓存", Guide: "1.执行预热脚本 2.监控预热进度 3.验证缓存数据", TimeoutMinutes: 10},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段4：数据保护与切换",
			Order: 4,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：数据备份",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：数据库备份",
							Order:      1,
							Department: "数据库组",
							Operations: []OpDef{
								{Name: "操作1：执行全量备份", Order: 1, Description: "执行数据库全量备份", Guide: "1.启动备份任务 2.监控备份进度 3.验证备份完整", TimeoutMinutes: 30},
								{Name: "操作2：验证备份文件", Order: 2, Description: "验证备份文件完整性", Guide: "1.检查备份文件大小 2.验证备份文件格式 3.确认备份可用", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：配置备份",
							Order:      2,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：备份系统配置", Order: 1, Description: "备份当前系统配置", Guide: "1.导出配置文件 2.上传备份存储 3.验证备份完整", TimeoutMinutes: 5},
								{Name: "操作2：备份应用配置", Order: 2, Description: "备份应用配置", Guide: "1.导出应用配置 2.保存配置版本 3.确认配置备份", TimeoutMinutes: 5},
							},
						},
					},
				},
				{
					Name:  "环节2：服务切换",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：数据库切换",
							Order:      1,
							Department: "数据库组",
							Operations: []OpDef{
								{Name: "操作1：主从切换", Order: 1, Description: "执行数据库主从切换", Guide: "1.停止主库写入 2.提升从库为主库 3.更新应用配置", TimeoutMinutes: 20},
								{Name: "操作2：验证切换结果", Order: 2, Description: "验证数据库切换结果", Guide: "1.检查主库状态 2.检查从库状态 3.验证数据一致", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：应用切换",
							Order:      2,
							Department: "应用运维组",
							Operations: []OpDef{
								{Name: "操作1：切换应用服务", Order: 1, Description: "切换应用到备用环境", Guide: "1.更新服务配置 2.重启应用服务 3.验证服务状态", TimeoutMinutes: 15},
								{Name: "操作2：切换流量入口", Order: 2, Description: "切换流量入口到备用环境", Guide: "1.修改DNS解析 2.更新负载均衡 3.验证流量走向", TimeoutMinutes: 10},
								{Name: "操作3：验证切换效果", Order: 3, Description: "验证整体切换效果", Guide: "1.检查服务可用性 2.检查业务功能 3.确认切换成功", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节3：数据同步",
					Order: 3,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：重建同步关系",
							Order:      1,
							Department: "数据库组",
							Operations: []OpDef{
								{Name: "操作1：配置主从同步", Order: 1, Description: "配置新的主从同步关系", Guide: "1.配置同步参数 2.启动同步进程 3.监控同步状态", TimeoutMinutes: 15},
								{Name: "操作2：验证同步状态", Order: 2, Description: "验证数据同步状态", Guide: "1.检查同步延迟 2.检查数据一致性 3.确认同步正常", TimeoutMinutes: 10},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段5：核心业务恢复",
			Order: 5,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：服务恢复",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：恢复核心服务",
							Order:      1,
							Department: "应用运维组",
							Operations: []OpDef{
								{Name: "操作1：恢复服务配置", Order: 1, Description: "恢复服务正常配置", Guide: "1.恢复服务参数 2.恢复功能开关 3.确认配置生效", TimeoutMinutes: 5},
								{Name: "操作2：重启核心服务", Order: 2, Description: "重启核心业务服务", Guide: "1.停止降级服务 2.启动正常服务 3.验证服务状态", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：恢复流量控制",
							Order:      2,
							Department: "网关组",
							Operations: []OpDef{
								{Name: "操作1：移除限流规则", Order: 1, Description: "移除临时限流规则", Guide: "1.删除限流配置 2.恢复正常限流 3.确认规则生效", TimeoutMinutes: 5},
								{Name: "操作2：移除熔断规则", Order: 2, Description: "移除临时熔断规则", Guide: "1.删除熔断配置 2.恢复正常熔断 3.确认规则生效", TimeoutMinutes: 5},
							},
						},
					},
				},
				{
					Name:  "环节2：功能恢复",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：恢复业务功能",
							Order:      1,
							Department: "业务组",
							Operations: []OpDef{
								{Name: "操作1：恢复交易功能", Order: 1, Description: "恢复交易业务功能", Guide: "1.开启交易通道 2.恢复交易限额 3.验证交易功能", TimeoutMinutes: 10},
								{Name: "操作2：恢复支付功能", Order: 2, Description: "恢复支付业务功能", Guide: "1.恢复支付通道 2.恢复支付限额 3.验证支付功能", TimeoutMinutes: 10},
								{Name: "操作3：恢复查询功能", Order: 3, Description: "恢复查询业务功能", Guide: "1.恢复查询服务 2.恢复缓存策略 3.验证查询功能", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：恢复监控告警",
							Order:      2,
							Department: "监控中心",
							Operations: []OpDef{
								{Name: "操作1：恢复告警规则", Order: 1, Description: "恢复正常告警规则", Guide: "1.恢复告警阈值 2.恢复告警通知 3.确认告警正常", TimeoutMinutes: 5},
								{Name: "操作2：更新监控大盘", Order: 2, Description: "更新监控大盘配置", Guide: "1.更新数据源 2.刷新监控面板 3.确认大盘正常", TimeoutMinutes: 5},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段6：功能验证测试",
			Order: 6,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：核心功能测试",
					Order: 1,
					Mode:  "parallel",
					Tasks: []TaskDef{
						{
							Name:       "任务1：交易功能测试",
							Order:      1,
							Department: "测试组",
							Operations: []OpDef{
								{Name: "操作1：执行交易测试", Order: 1, Description: "执行交易功能测试用例", Guide: "1.准备测试数据 2.执行测试用例 3.记录测试结果", TimeoutMinutes: 15},
								{Name: "操作2：验证交易结果", Order: 2, Description: "验证交易结果正确性", Guide: "1.检查交易状态 2.检查账户余额 3.确认结果正确", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：支付功能测试",
							Order:      2,
							Department: "测试组",
							Operations: []OpDef{
								{Name: "操作1：执行支付测试", Order: 1, Description: "执行支付功能测试用例", Guide: "1.准备测试数据 2.执行支付测试 3.记录测试结果", TimeoutMinutes: 15},
								{Name: "操作2：验证支付结果", Order: 2, Description: "验证支付结果正确性", Guide: "1.检查支付状态 2.检查资金变动 3.确认结果正确", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务3：查询功能测试",
							Order:      3,
							Department: "测试组",
							Operations: []OpDef{
								{Name: "操作1：执行查询测试", Order: 1, Description: "执行查询功能测试用例", Guide: "1.准备测试数据 2.执行查询测试 3.记录测试结果", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节2：性能验证",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：性能测试",
							Order:      1,
							Department: "性能测试组",
							Operations: []OpDef{
								{Name: "操作1：执行压测", Order: 1, Description: "执行系统压力测试", Guide: "1.配置压测场景 2.启动压测任务 3.收集压测数据", TimeoutMinutes: 30},
								{Name: "操作2：分析压测结果", Order: 2, Description: "分析压力测试结果", Guide: "1.查看TPS指标 2.分析响应时间 3.评估系统性能", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：监控验证",
							Order:      2,
							Department: "监控中心",
							Operations: []OpDef{
								{Name: "操作1：检查系统指标", Order: 1, Description: "检查系统各项监控指标", Guide: "1.检查CPU/内存 2.检查网络IO 3.检查磁盘IO", TimeoutMinutes: 10},
								{Name: "操作2：确认告警状态", Order: 2, Description: "确认无异常告警", Guide: "1.检查告警列表 2.确认无异常告警 3.记录监控状态", TimeoutMinutes: 5},
							},
						},
					},
				},
				{
					Name:  "环节3：安全验证",
					Order: 3,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：安全检查",
							Order:      1,
							Department: "安全组",
							Operations: []OpDef{
								{Name: "操作1：检查访问控制", Order: 1, Description: "检查系统访问控制", Guide: "1.检查权限配置 2.检查访问日志 3.确认权限正常", TimeoutMinutes: 10},
								{Name: "操作2：检查数据安全", Order: 2, Description: "检查数据安全状态", Guide: "1.检查数据加密 2.检查敏感数据 3.确认数据安全", TimeoutMinutes: 10},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段7：故障根因分析",
			Order: 7,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：数据收集",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：日志收集",
							Order:      1,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：收集系统日志", Order: 1, Description: "收集各系统日志文件", Guide: "1.收集应用日志 2.收集系统日志 3.收集中间件日志", TimeoutMinutes: 15},
								{Name: "操作2：收集监控数据", Order: 2, Description: "收集故障期间监控数据", Guide: "1.导出监控指标 2.导出告警记录 3.整理监控数据", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：操作记录收集",
							Order:      2,
							Department: "综合管理组",
							Operations: []OpDef{
								{Name: "操作1：收集操作记录", Order: 1, Description: "收集故障处理操作记录", Guide: "1.收集操作日志 2.收集沟通记录 3.整理操作时间线", TimeoutMinutes: 10},
								{Name: "操作2：收集配置变更", Order: 2, Description: "收集故障期间配置变更", Guide: "1.收集配置变更记录 2.整理变更内容 3.确认变更影响", TimeoutMinutes: 5},
							},
						},
					},
				},
				{
					Name:  "环节2：根因分析",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：技术分析",
							Order:      1,
							Department: "技术专家组",
							Operations: []OpDef{
								{Name: "操作1：分析故障原因", Order: 1, Description: "分析故障技术原因", Guide: "1.分析日志信息 2.分析监控数据 3.定位故障根因", TimeoutMinutes: 30},
								{Name: "操作2：分析影响范围", Order: 2, Description: "分析故障影响范围", Guide: "1.分析受影响系统 2.分析受影响用户 3.评估影响程度", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：流程分析",
							Order:      2,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：分析响应流程", Order: 1, Description: "分析应急响应流程", Guide: "1.分析响应时效 2.分析流程执行 3.识别流程问题", TimeoutMinutes: 15},
								{Name: "操作2：分析沟通效率", Order: 2, Description: "分析沟通协调效率", Guide: "1.分析沟通渠道 2.分析信息传递 3.识别沟通问题", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节3：改进建议",
					Order: 3,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：制定改进措施",
							Order:      1,
							Department: "技术专家组",
							Operations: []OpDef{
								{Name: "操作1：制定技术改进", Order: 1, Description: "制定技术改进措施", Guide: "1.列出技术问题 2.制定改进方案 3.确定改进优先级", TimeoutMinutes: 20},
								{Name: "操作2：制定流程改进", Order: 2, Description: "制定流程改进措施", Guide: "1.列出流程问题 2.制定改进方案 3.确定改进优先级", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：制定预防措施",
							Order:      2,
							Department: "风险管理组",
							Operations: []OpDef{
								{Name: "操作1：制定预防措施", Order: 1, Description: "制定故障预防措施", Guide: "1.识别风险点 2.制定预防措施 3.确定实施计划", TimeoutMinutes: 15},
								{Name: "操作2：更新应急预案", Order: 2, Description: "更新应急预案文档", Guide: "1.更新预案内容 2.更新操作手册 3.发布预案更新", TimeoutMinutes: 10},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段8：演练总结归档",
			Order: 8,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：演练总结",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：数据汇总",
							Order:      1,
							Department: "综合管理组",
							Operations: []OpDef{
								{Name: "操作1：汇总演练数据", Order: 1, Description: "汇总演练各项数据", Guide: "1.统计各阶段耗时 2.统计资源消耗 3.汇总问题清单", TimeoutMinutes: 15},
								{Name: "操作2：整理演练记录", Order: 2, Description: "整理演练过程记录", Guide: "1.整理时间线 2.整理决策记录 3.整理沟通记录", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：召开总结会",
							Order:      2,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：准备总结材料", Order: 1, Description: "准备演练总结材料", Guide: "1.编写总结报告 2.准备汇报PPT 3.准备问题清单", TimeoutMinutes: 20},
								{Name: "操作2：召开总结会议", Order: 2, Description: "召开演练总结会议", Guide: "1.通知参会人员 2.召开总结会议 3.记录会议纪要", TimeoutMinutes: 30},
							},
						},
					},
				},
				{
					Name:  "环节2：报告编写",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：编写演练报告",
							Order:      1,
							Department: "综合管理组",
							Operations: []OpDef{
								{Name: "操作1：编写报告正文", Order: 1, Description: "编写演练报告正文", Guide: "1.概述演练背景 2.描述演练过程 3.分析演练结果", TimeoutMinutes: 30},
								{Name: "操作2：编写改进建议", Order: 2, Description: "编写改进建议章节", Guide: "1.列出问题清单 2.提出改进建议 3.确定责任人和时间", TimeoutMinutes: 20},
							},
						},
						{
							Name:       "任务2：报告评审",
							Order:      2,
							Department: "决策层",
							Operations: []OpDef{
								{Name: "操作1：报告评审", Order: 1, Description: "评审演练报告", Guide: "1.提交报告评审 2.收集评审意见 3.修改报告内容", TimeoutMinutes: 15},
								{Name: "操作2：报告发布", Order: 2, Description: "发布演练报告", Guide: "1.确认报告终稿 2.发布报告 3.通知相关人员", TimeoutMinutes: 5},
							},
						},
					},
				},
				{
					Name:  "环节3：归档整理",
					Order: 3,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：文档归档",
							Order:      1,
							Department: "综合管理组",
							Operations: []OpDef{
								{Name: "操作1：整理演练文档", Order: 1, Description: "整理演练相关文档", Guide: "1.整理报告文档 2.整理记录文档 3.整理配置文档", TimeoutMinutes: 10},
								{Name: "操作2：归档演练数据", Order: 2, Description: "归档演练数据", Guide: "1.上传文档归档 2.备份数据归档 3.确认归档完成", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：环境清理",
							Order:      2,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：清理测试数据", Order: 1, Description: "清理演练测试数据", Guide: "1.识别测试数据 2.执行清理脚本 3.验证清理结果", TimeoutMinutes: 15},
								{Name: "操作2：恢复演练标记", Order: 2, Description: "解除演练相关标记", Guide: "1.解除演练标记 2.恢复正常监控 3.确认环境就绪", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务3：经验总结",
							Order:      3,
							Department: "培训组",
							Operations: []OpDef{
								{Name: "操作1：更新培训材料", Order: 1, Description: "更新应急培训材料", Guide: "1.总结演练经验 2.更新培训案例 3.发布培训材料", TimeoutMinutes: 20},
								{Name: "操作2：组织经验分享", Order: 2, Description: "组织经验分享会", Guide: "1.安排分享时间 2.通知参与人员 3.召开分享会", TimeoutMinutes: 10},
							},
						},
					},
				},
			},
		},
	}

	now := time.Now()

	for _, pd := range phases {
		phase := &model.Phase{
			TemplateID:    templateID,
			Name:          pd.Name,
			Order:         pd.Order,
			ExecutionMode: pd.Mode,
			Status:        "pending",
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		if err := database.Create(phase).Error; err != nil {
			return fmt.Errorf("failed to create phase %s: %v", pd.Name, err)
		}
		fmt.Printf("Phase: %s (ID: %d)\n", phase.Name, phase.ID)

		for _, sd := range pd.Stages {
			stage := &model.Stage{
				PhaseID:       phase.ID,
				Name:          sd.Name,
				Order:         sd.Order,
				ExecutionMode: sd.Mode,
				Status:        "pending",
				CreatedAt:     now,
				UpdatedAt:     now,
			}
			if err := database.Create(stage).Error; err != nil {
				return fmt.Errorf("failed to create stage %s: %v", sd.Name, err)
			}
			fmt.Printf("  Stage: %s (ID: %d)\n", stage.Name, stage.ID)

			for _, td := range sd.Tasks {
				task := &model.Task{
					StageID:       stage.ID,
					Name:          td.Name,
					Order:         td.Order,
					Department:    td.Department,
					ExecutionMode: "serial",
					Status:        "pending",
					CreatedAt:     now,
					UpdatedAt:     now,
				}
				if err := database.Create(task).Error; err != nil {
					return fmt.Errorf("failed to create task %s: %v", td.Name, err)
				}
				fmt.Printf("    Task: %s (ID: %d)\n", task.Name, task.ID)

				for _, od := range td.Operations {
					op := &model.Operation{
						TaskID:         task.ID,
						Name:           od.Name,
						Order:          od.Order,
						Description:    od.Description,
						Guide:          od.Guide,
						TimeoutMinutes: od.TimeoutMinutes,
						ExecutionMode:  "serial",
						Status:         "pending",
						CreatedAt:      now,
						UpdatedAt:      now,
					}
					if err := database.Create(op).Error; err != nil {
						return fmt.Errorf("failed to create operation %s: %v", od.Name, err)
					}
					fmt.Printf("      Op: %s (ID: %d)\n", op.Name, op.ID)
				}
			}
		}
	}

	return nil
}
