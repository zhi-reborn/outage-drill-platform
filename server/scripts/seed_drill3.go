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

	err = seedDrill3(database, templateID)
	if err != nil {
		log.Fatal("Failed to seed drill3:", err)
	}

	fmt.Println("Drill3 workflow data seeded successfully!")
}

func createTemplate(db *gorm.DB) (uint, error) {
	tmpl := &model.DrillTemplate{
		Name:        "演练3：金融系统容灾演练",
		Description: "模拟金融核心系统发生灾难故障，通过多阶段容灾操作完成系统切换和数据恢复，验证业务连续性保障能力",
	}
	if err := db.Create(tmpl).Error; err != nil {
		return 0, fmt.Errorf("failed to create template: %v", err)
	}
	fmt.Printf("Created Template: %s (ID: %d)\n", tmpl.Name, tmpl.ID)
	return tmpl.ID, nil
}

func seedDrill3(database *gorm.DB, templateID uint) error {
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
			Name:  "阶段1：故障确认与通报",
			Order: 1,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：故障发现",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：监控告警确认",
							Order:      1,
							Department: "监控中心",
							Operations: []OpDef{
								{Name: "操作1：查看监控大盘", Order: 1, Description: "查看监控系统确认异常指标", Guide: "1.登录监控平台 2.查看CPU/内存/网络指标 3.确认告警级别", TimeoutMinutes: 5},
								{Name: "操作2：确认故障影响范围", Order: 2, Description: "评估故障影响的服务和用户范围", Guide: "1.检查受影响服务列表 2.评估用户影响数量 3.确定故障等级", TimeoutMinutes: 10},
								{Name: "操作3：记录故障时间线", Order: 3, Description: "记录故障发生时间和关键时间节点", Guide: "1.记录首次告警时间 2.记录故障现象 3.更新故障工单", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：一线排查",
							Order:      2,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：检查基础设施", Order: 1, Description: "检查网络、服务器等基础设施状态", Guide: "1.ping核心服务器 2.检查交换机状态 3.检查机房环境", TimeoutMinutes: 10},
								{Name: "操作2：排查应用服务", Order: 2, Description: "检查应用服务运行状态", Guide: "1.检查核心服务进程 2.查看应用日志 3.检查依赖服务", TimeoutMinutes: 15},
							},
						},
					},
				},
				{
					Name:  "环节2：故障升级",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：启动应急流程",
							Order:      1,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：召集应急响应团队", Order: 1, Description: "通知相关技术负责人和应急团队", Guide: "1.拨打应急电话 2.发送应急短信 3.开启应急群聊", TimeoutMinutes: 10},
								{Name: "操作2：召开紧急会议", Order: 2, Description: "组织线上/线下紧急会议", Guide: "1.创建会议链接 2.通知参会人员 3.开始会议", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：发布故障通告",
							Order:      2,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：编写故障通告", Order: 1, Description: "编写故障影响通告内容", Guide: "1.说明故障现象 2.说明影响范围 3.说明预计恢复时间", TimeoutMinutes: 10},
								{Name: "操作2：发布内部通告", Order: 2, Description: "通过内部渠道发布故障通告", Guide: "1.发送邮件通知 2.更新状态页 3.通知业务方", TimeoutMinutes: 5},
								{Name: "操作3：通知客户", Order: 3, Description: "通知受影响的客户", Guide: "1.识别受影响客户 2.发送客户通知 3.开通客服热线", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节3：决策评审",
					Order: 3,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：评估切换方案",
							Order:      1,
							Department: "架构组",
							Operations: []OpDef{
								{Name: "操作1：评估故障严重程度", Order: 1, Description: "评估是否达到容灾切换标准", Guide: "1.检查SLA指标 2.评估业务损失 3.确认切换条件", TimeoutMinutes: 10},
								{Name: "操作2：选择容灾方案", Order: 2, Description: "选择合适的容灾切换方案", Guide: "1.评估主备切换方案 2.评估多活方案 3.确认最终方案", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：审批确认",
							Order:      2,
							Department: "决策层",
							Operations: []OpDef{
								{Name: "操作1：领导审批", Order: 1, Description: "决策层审批容灾切换方案", Guide: "1.汇报故障情况 2.说明切换方案 3.获得审批", TimeoutMinutes: 10},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段2：系统降级与服务切换",
			Order: 2,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：核心服务降级",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：交易服务降级",
							Order:      1,
							Department: "交易系统组",
							Operations: []OpDef{
								{Name: "操作1：关闭非核心交易", Order: 1, Description: "关闭非核心交易通道", Guide: "1.登录交易管理平台 2.关闭理财/基金等非核心交易 3.确认关闭状态", TimeoutMinutes: 5},
								{Name: "操作2：降低交易限额", Order: 2, Description: "降低核心交易限额", Guide: "1.登录风控平台 2.调整交易限额 3.确认生效", TimeoutMinutes: 10},
								{Name: "操作3：切换交易路由", Order: 3, Description: "将交易流量切换到备用通道", Guide: "1.登录网关管理 2.切换路由规则 3.验证流量走向", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：支付服务降级",
							Order:      2,
							Department: "支付系统组",
							Operations: []OpDef{
								{Name: "操作1：切换支付通道", Order: 1, Description: "切换到备用支付通道", Guide: "1.登录支付管理平台 2.切换主备通道 3.测试支付", TimeoutMinutes: 10},
								{Name: "操作2：暂停第三方渠道", Order: 2, Description: "暂停非核心的第三方支付渠道", Guide: "1.登录渠道管理 2.暂停非核心渠道 3.确认状态", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务3：风控服务降级",
							Order:      3,
							Department: "风控组",
							Operations: []OpDef{
								{Name: "操作1：切换风控引擎", Order: 1, Description: "将风控引擎切换到备用节点", Guide: "1.登录风控管理台 2.切换主备引擎 3.验证风控规则", TimeoutMinutes: 10},
								{Name: "操作2：简化风控规则", Order: 2, Description: "临时简化风控规则以保障业务", Guide: "1.评估降级规则 2.调整风控阈值 3.确认生效", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节2：数据库切换",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：主库切换",
							Order:      1,
							Department: "数据库运维组",
							Operations: []OpDef{
								{Name: "操作1：确认主从同步状态", Order: 1, Description: "检查数据库主从同步是否正常", Guide: "1.登录数据库管理台 2.执行SHOW SLAVE STATUS 3.确认Seconds_Behind_Master", TimeoutMinutes: 5},
								{Name: "操作2：执行主从切换", Order: 2, Description: "将主库切换到从库", Guide: "1.停止主库写入 2.确认从库同步完成 3.提升从库为主库 4.更新连接配置", TimeoutMinutes: 20},
								{Name: "操作3：验证数据一致性", Order: 3, Description: "验证切换后数据一致性", Guide: "1.对比关键表数据量 2.检查最新记录 3.验证索引完整", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：缓存集群切换",
							Order:      2,
							Department: "中间件组",
							Operations: []OpDef{
								{Name: "操作1：切换Redis集群", Order: 1, Description: "切换到Redis备用集群", Guide: "1.登录Redis管理台 2.切换集群配置 3.重启缓存服务", TimeoutMinutes: 10},
								{Name: "操作2：预热缓存数据", Order: 2, Description: "从数据库预热核心缓存数据", Guide: "1.执行缓存预热脚本 2.监控预热进度 3.验证缓存命中率", TimeoutMinutes: 20},
							},
						},
					},
				},
				{
					Name:  "环节3：应用服务切换",
					Order: 3,
					Mode:  "parallel",
					Tasks: []TaskDef{
						{
							Name:       "任务1：Web服务切换",
							Order:      1,
							Department: "应用运维组",
							Operations: []OpDef{
								{Name: "操作1：修改DNS解析", Order: 1, Description: "将域名解析切换到备用数据中心", Guide: "1.登录DNS管理台 2.修改A记录指向备用IP 3.等待DNS生效", TimeoutMinutes: 10},
								{Name: "操作2：验证Web服务", Order: 2, Description: "验证备用数据中心Web服务正常", Guide: "1.访问首页检查 2.测试登录功能 3.检查核心页面", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：API网关切换",
							Order:      2,
							Department: "网关组",
							Operations: []OpDef{
								{Name: "操作1：切换API网关路由", Order: 1, Description: "将API网关流量切换到备用集群", Guide: "1.登录网关管理台 2.修改upstream配置 3.验证路由转发", TimeoutMinutes: 10},
								{Name: "操作2：验证API服务", Order: 2, Description: "验证API服务可用性和响应时间", Guide: "1.调用健康检查接口 2.测试核心API 3.检查响应时间", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节4：网络切换",
					Order: 4,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：专线切换",
							Order:      1,
							Department: "网络组",
							Operations: []OpDef{
								{Name: "操作1：切换专线链路", Order: 1, Description: "切换到备用网络专线", Guide: "1.登录网络设备 2.修改路由策略 3.验证链路连通", TimeoutMinutes: 15},
								{Name: "操作2：验证网络质量", Order: 2, Description: "验证备用网络延迟和带宽", Guide: "1.ping测试延迟 2.traceroute检查路径 3.带宽测试", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务2：防火墙策略同步",
							Order:      2,
							Department: "安全组",
							Operations: []OpDef{
								{Name: "操作1：同步防火墙规则", Order: 1, Description: "将防火墙策略同步到备用环境", Guide: "1.导出防火墙配置 2.导入备用环境 3.验证规则生效", TimeoutMinutes: 15},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段3：数据恢复与验证",
			Order: 3,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：数据完整性检查",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：核心数据校验",
							Order:      1,
							Department: "数据库运维组",
							Operations: []OpDef{
								{Name: "操作1：检查账户数据", Order: 1, Description: "校验用户账户余额和状态", Guide: "1.抽样检查账户 2.比对余额数据 3.确认数据一致", TimeoutMinutes: 20},
								{Name: "操作2：检查交易流水", Order: 2, Description: "校验近期交易流水完整性", Guide: "1.查询最近交易记录 2.比对交易金额 3.确认流水完整", TimeoutMinutes: 15},
								{Name: "操作3：检查持仓数据", Order: 3, Description: "校验投资持仓数据准确性", Guide: "1.检查持仓汇总 2.对比市值 3.确认无误", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：日志审计",
							Order:      2,
							Department: "审计组",
							Operations: []OpDef{
								{Name: "操作1：审查切换日志", Order: 1, Description: "审查容灾切换过程的完整日志", Guide: "1.检查操作日志 2.审查异常记录 3.确认无异常操作", TimeoutMinutes: 20},
								{Name: "操作2：生成审计报告", Order: 2, Description: "生成数据完整性审计报告", Guide: "1.汇总检查结果 2.编写审计结论 3.提交报告", TimeoutMinutes: 15},
							},
						},
					},
				},
				{
					Name:  "环节2：业务功能验证",
					Order: 2,
					Mode:  "parallel",
					Tasks: []TaskDef{
						{
							Name:       "任务1：转账功能验证",
							Order:      1,
							Department: "测试组",
							Operations: []OpDef{
								{Name: "操作1：执行测试转账", Order: 1, Description: "执行转账功能测试", Guide: "1.登录测试账户 2.发起转账交易 3.确认到账", TimeoutMinutes: 10},
								{Name: "操作2：验证到账通知", Order: 2, Description: "验证转账到账短信和通知", Guide: "1.检查短信通知 2.检查APP推送 3.确认消息到达", TimeoutMinutes: 5},
							},
						},
						{
							Name:       "任务2：查询功能验证",
							Order:      2,
							Department: "测试组",
							Operations: []OpDef{
								{Name: "操作1：验证余额查询", Order: 1, Description: "验证账户余额查询功能", Guide: "1.登录网银 2.查询账户余额 3.对比数据", TimeoutMinutes: 5},
								{Name: "操作2：验证流水查询", Order: 2, Description: "验证交易流水查询功能", Guide: "1.查询最近交易 2.检查流水详情 3.确认完整", TimeoutMinutes: 5},
								{Name: "操作3：验证对账单", Order: 3, Description: "验证电子对账单功能", Guide: "1.下载对账单 2.检查格式和内容 3.确认无误", TimeoutMinutes: 10},
							},
						},
						{
							Name:       "任务3：理财功能验证",
							Order:      3,
							Department: "测试组",
							Operations: []OpDef{
								{Name: "操作1：验证理财产品", Order: 1, Description: "验证理财产品展示和购买功能", Guide: "1.查看产品列表 2.检查产品详情 3.测试购买流程", TimeoutMinutes: 15},
							},
						},
					},
				},
				{
					Name:  "环节3：性能验证",
					Order: 3,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：压力测试",
							Order:      1,
							Department: "性能测试组",
							Operations: []OpDef{
								{Name: "操作1：执行压测", Order: 1, Description: "执行系统压力测试", Guide: "1.启动压测工具 2.配置压测场景 3.执行压力测试 4.收集结果", TimeoutMinutes: 30},
								{Name: "操作2：分析压测结果", Order: 2, Description: "分析压力测试结果", Guide: "1.查看TPS指标 2.分析响应时间分布 3.评估系统容量", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：监控巡检",
							Order:      2,
							Department: "监控中心",
							Operations: []OpDef{
								{Name: "操作1：全链路巡检", Order: 1, Description: "执行全链路系统巡检", Guide: "1.检查各服务状态 2.检查资源利用率 3.确认无异常告警", TimeoutMinutes: 20},
								{Name: "操作2：更新监控大盘", Order: 2, Description: "更新监控面板和告警配置", Guide: "1.更新数据源指向 2.调整告警阈值 3.确认大盘正常", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节4：回滚预案确认",
					Order: 4,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：制定回滚方案",
							Order:      1,
							Department: "架构组",
							Operations: []OpDef{
								{Name: "操作1：评估回滚条件", Order: 1, Description: "评估在什么情况下需要回滚", Guide: "1.定义回滚触发条件 2.制定回滚步骤 3.评估回滚风险", TimeoutMinutes: 15},
								{Name: "操作2：准备回滚脚本", Order: 2, Description: "准备自动化回滚脚本", Guide: "1.编写回滚脚本 2.测试脚本执行 3.确认脚本可用", TimeoutMinutes: 20},
							},
						},
						{
							Name:       "任务2：回滚预演",
							Order:      2,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：模拟回滚流程", Order: 1, Description: "模拟执行回滚流程", Guide: "1.按回滚方案走流程 2.记录每个步骤耗时 3.评估可行性", TimeoutMinutes: 20},
							},
						},
					},
				},
			},
		},
		{
			Name:  "阶段4：总结与恢复",
			Order: 4,
			Mode:  "serial",
			Stages: []StageDef{
				{
					Name:  "环节1：故障恢复",
					Order: 1,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：原主环境修复",
							Order:      1,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：诊断故障根因", Order: 1, Description: "诊断原主环境的故障根本原因", Guide: "1.分析系统日志 2.检查硬件状态 3.确认根因", TimeoutMinutes: 30},
								{Name: "操作2：修复故障", Order: 2, Description: "修复原主环境故障", Guide: "1.根据根因制定修复方案 2.执行修复操作 3.验证修复结果", TimeoutMinutes: 30},
								{Name: "操作3：重建数据同步", Order: 3, Description: "重建主从数据同步关系", Guide: "1.配置主从复制 2.等待数据同步完成 3.验证同步状态", TimeoutMinutes: 20},
							},
						},
						{
							Name:       "任务2：系统回切",
							Order:      2,
							Department: "架构组",
							Operations: []OpDef{
								{Name: "操作1：评估回切时机", Order: 1, Description: "评估是否满足回切条件", Guide: "1.确认主环境修复完成 2.确认数据同步正常 3.确定回切窗口", TimeoutMinutes: 15},
								{Name: "操作2：执行回切操作", Order: 2, Description: "将流量切回原主环境", Guide: "1.通知相关团队 2.逐步切回流量 3.监控回切过程", TimeoutMinutes: 20},
							},
						},
					},
				},
				{
					Name:  "环节2：演练总结",
					Order: 2,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：数据汇总",
							Order:      1,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：收集各环节数据", Order: 1, Description: "收集演练各环节的执行数据", Guide: "1.统计各阶段耗时 2.收集问题清单 3.汇总操作记录", TimeoutMinutes: 20},
								{Name: "操作2：整理演练记录", Order: 2, Description: "整理演练过程记录", Guide: "1.整理时间线 2.整理决策记录 3.整理沟通记录", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：问题复盘",
							Order:      2,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：召开复盘会议", Order: 1, Description: "组织演练复盘会议", Guide: "1.邀请各团队参与 2.回顾演练过程 3.识别问题和亮点", TimeoutMinutes: 30},
								{Name: "操作2：记录改进项", Order: 2, Description: "记录需要改进的事项", Guide: "1.记录发现的问题 2.提出改进建议 3.确定责任人", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务3：编写报告",
							Order:      3,
							Department: "应急指挥组",
							Operations: []OpDef{
								{Name: "操作1：编写演练报告", Order: 1, Description: "编写完整的演练总结报告", Guide: "1.概述演练目标 2.描述演练过程 3.分析问题 4.提出改进建议", TimeoutMinutes: 30},
								{Name: "操作2：提交报告", Order: 2, Description: "提交演练报告并归档", Guide: "1.报告评审 2.提交管理层 3.归档文档", TimeoutMinutes: 10},
							},
						},
					},
				},
				{
					Name:  "环节3：环境清理",
					Order: 3,
					Mode:  "serial",
					Tasks: []TaskDef{
						{
							Name:       "任务1：清理测试数据",
							Order:      1,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：清理测试交易数据", Order: 1, Description: "清理演练过程中产生的测试数据", Guide: "1.识别测试数据 2.执行清理脚本 3.验证清理结果", TimeoutMinutes: 15},
								{Name: "操作2：恢复配置", Order: 2, Description: "恢复演练前的系统配置", Guide: "1.对比配置变更 2.还原临时修改 3.验证配置正确", TimeoutMinutes: 15},
							},
						},
						{
							Name:       "任务2：解除演练标记",
							Order:      2,
							Department: "运维组",
							Operations: []OpDef{
								{Name: "操作1：解除系统标记", Order: 1, Description: "解除演练相关的系统标记和告警", Guide: "1.关闭演练告警组 2.恢复正常监控 3.确认系统就绪", TimeoutMinutes: 10},
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
