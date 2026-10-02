import { Router } from 'express';
import {
  submitRating,
  getPropertyRatings,
  getCustomerRatings,
  deleteRating,
  createInquiry,
  getInquiryById,
  listInquiries,
  respondToInquiry,
  createComplaint,
  getComplaintById,
  listComplaints,
  updateComplaintStatus,
} from '../services/feedbackService.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';

export const feedbackRouter = Router();

// --- RATINGS ---
// Submit or update rating
feedbackRouter.post('/ratings', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rating = await submitRating(req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully.',
      data: rating,
    });
  } catch (err) {
    next(err);
  }
});

// Get ratings for a property
feedbackRouter.get('/ratings/property/:propertyId', async (req, res, next) => {
  try {
    const ratings = await getPropertyRatings(req.params.propertyId);
    res.json({
      success: true,
      message: 'Property ratings retrieved.',
      data: ratings,
    });
  } catch (err) {
    next(err);
  }
});

// Get customer's submitted ratings
feedbackRouter.get('/ratings/my', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const ratings = await getCustomerRatings(req.user!.userId);
    res.json({
      success: true,
      message: 'Customer ratings retrieved.',
      data: ratings,
    });
  } catch (err) {
    next(err);
  }
});

// Delete a rating
feedbackRouter.delete('/ratings/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await deleteRating(req.user!.userId, req.user!.role, req.params.id);
    res.json({
      success: true,
      message: 'Rating deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// --- INQUIRIES ---
// Submit inquiry (Customer)
feedbackRouter.post('/inquiries', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const inquiry = await createInquiry(req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      message: `Inquiry submitted successfully. Ticket ID: ${inquiry.ticketId}`,
      data: inquiry,
    });
  } catch (err) {
    next(err);
  }
});

// List inquiries (Customer gets own, Agent/Admin gets all/assigned)
feedbackRouter.get('/inquiries', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.query;
    const inquiries = await listInquiries(req.user!.userId, req.user!.role, status as string);
    res.json({
      success: true,
      message: 'Inquiries retrieved successfully.',
      data: inquiries,
    });
  } catch (err) {
    next(err);
  }
});

// Get inquiry by ID
feedbackRouter.get('/inquiries/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const inquiry = await getInquiryById(req.params.id, req.user!.role, req.user!.userId);
    res.json({
      success: true,
      message: 'Inquiry details retrieved.',
      data: inquiry,
    });
  } catch (err) {
    next(err);
  }
});

// Respond to inquiry (Agent or Admin)
feedbackRouter.post('/inquiries/:id/respond', requireRole('AGENT', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await respondToInquiry(req.user!.userId, req.user!.role, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Response sent successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// --- COMPLAINTS ---
// Submit complaint (Customer)
feedbackRouter.post('/complaints', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const complaint = await createComplaint(req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      message: `Complaint registered. Ticket ID: ${complaint.ticketId}`,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
});

// List complaints
feedbackRouter.get('/complaints', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.query;
    const complaints = await listComplaints(req.user!.userId, req.user!.role, status as string);
    res.json({
      success: true,
      message: 'Complaints retrieved successfully.',
      data: complaints,
    });
  } catch (err) {
    next(err);
  }
});

// Get complaint details
feedbackRouter.get('/complaints/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const complaint = await getComplaintById(req.params.id, req.user!.role, req.user!.userId);
    res.json({
      success: true,
      message: 'Complaint details retrieved.',
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
});

// Resolve complaint (Admin or Agent)
feedbackRouter.post('/complaints/:id/resolve', requireRole('AGENT', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updateComplaintStatus(req.user!.userId, req.user!.role, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Complaint updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});
