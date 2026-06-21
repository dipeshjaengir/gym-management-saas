import { Router, Response } from 'express';
import { PlatformLead } from '../models';

const router = Router();

// 1. GET Subscription Plans Pricing (INR ₹)
router.get('/plans', (req, res) => {
  return res.json([
    { id: '1_month', name: '1 Month Kickstart', durationMonths: 1, price: 999, description: 'Best for trying out the platform and onboarding.' },
    { id: '3_month', name: '3 Month Growth', durationMonths: 3, price: 2499, description: 'Optimal for growing gyms to stabilize collections.' },
    { id: '6_month', name: '6 Month Premium', durationMonths: 6, price: 4499, description: 'Popular plan with QR scanners and expiry warn tools.' },
    { id: '12_month', name: '12 Month Scale', durationMonths: 12, price: 7999, description: 'Best value for established gym networks.' }
  ]);
});

// 2. POST Demo request inquiry (logs to CRM Leads Board)
router.post('/leads', async (req, res) => {
  const { name, phone, city, interestedPlan, source } = req.body;

  if (!name || !phone || !city) {
    return res.status(400).json({ message: 'Name, Phone, and City are required to log an inquiry.' });
  }

  try {
    const lead = await PlatformLead.create({
      name,
      phone,
      city,
      interestedPlan: interestedPlan || '1_month',
      source: source || 'website',
      status: 'new'
    });

    console.log(`[INCOMING CRM INQUIRY] Registered lead for ${name} (${phone}) from ${city}`);

    return res.status(201).json({
      message: 'Your inquiry has been logged. Our platform advisor will contact you on WhatsApp shortly!',
      lead
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error submitting demo request.' });
  }
});

export default router;
