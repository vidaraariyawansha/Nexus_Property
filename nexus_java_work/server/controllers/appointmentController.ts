import { Router } from 'express';
import {
  createAppointment,
  getAppointmentById,
  updateAppointmentStatus,
  getUserAppointments,
  getAvailableAgents,
} from '../services/appointmentService.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';

export const appointmentRouter = Router();

// Get active agents for appointment booking
appointmentRouter.get('/meta/agents', async (_req, res, next) => {
  try {
    const agents = await getAvailableAgents();
    res.json({
      success: true,
      message: 'Available agents retrieved.',
      data: agents,
    });
  } catch (err) {
    next(err);
  }
});

// List appointments for authenticated user
appointmentRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.query;
    const appointments = await getUserAppointments(req.user!.userId, req.user!.role, status as string);
    res.json({
      success: true,
      message: 'Appointments retrieved successfully.',
      data: appointments,
    });
  } catch (err) {
    next(err);
  }
});

// Book viewing appointment (Customer)
appointmentRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const appointment = await createAppointment(req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Viewing appointment requested successfully.',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
});

// Get appointment by ID
appointmentRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const appointment = await getAppointmentById(req.params.id, req.user!.role, req.user!.userId);
    res.json({
      success: true,
      message: 'Appointment details retrieved.',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
});

// Update appointment status (Confirm, Reschedule, Cancel, Complete)
appointmentRouter.post('/:id/action', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { action, rescheduledTime, reason } = req.body;
    const updated = await updateAppointmentStatus(
      req.user!.userId,
      req.user!.role,
      req.params.id,
      action,
      { rescheduledTime, reason }
    );
    res.json({
      success: true,
      message: `Appointment successfully ${action.toLowerCase()}ed.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});
