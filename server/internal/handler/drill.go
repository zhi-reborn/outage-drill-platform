package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type DrillHandler struct {
	drillSvc *service.DrillService
}

func NewDrillHandler(drillSvc *service.DrillService) *DrillHandler {
	return &DrillHandler{drillSvc: drillSvc}
}

type CreateDrillRequest struct {
	TemplateID uint   `json:"template_id" binding:"required"`
	Name       string `json:"name" binding:"required"`
}

func (h *DrillHandler) ListDrills(c *gin.Context) {
	drills, err := h.drillSvc.ListDrills()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, drills)
}

func (h *DrillHandler) GetDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	drill, err := h.drillSvc.GetDrill(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "drill not found"})
		return
	}

	c.JSON(http.StatusOK, drill)
}

func (h *DrillHandler) CreateDrill(c *gin.Context) {
	var req CreateDrillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	drill, err := h.drillSvc.CreateDrill(req.TemplateID, req.Name, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, drill)
}

func (h *DrillHandler) StartDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	if err := h.drillSvc.StartDrill(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "drill started"})
}

func (h *DrillHandler) PauseDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	if err := h.drillSvc.PauseDrill(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "drill paused"})
}

func (h *DrillHandler) ResumeDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	if err := h.drillSvc.ResumeDrill(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "drill resumed"})
}

func (h *DrillHandler) EndDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	if err := h.drillSvc.EndDrill(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "drill ended"})
}