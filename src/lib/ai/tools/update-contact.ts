import { tool } from 'ai';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';

// Define the arguments schema for the tool
const updateContactSchema = z.object({
  name: z.string().optional().describe('Full name of the contact'),
  company: z.string().optional().describe('Company name'),
  industry: z.string().optional().describe('Industry the contact operates in'),
  business_type: z.string().optional().describe('Type of business (e.g., B2B, eCommerce, Agency)'),
  requirement: z.string().optional().describe('What the contact is looking for'),
  problem: z.string().optional().describe('The problem the contact is trying to solve'),
  desired_outcome: z.string().optional().describe('What the contact hopes to achieve'),
  budget: z.string().optional().describe('The stated budget for the solution'),
  timeline: z.string().optional().describe('When they plan to implement or purchase'),
  location: z.string().optional().describe('Geographic location of the contact'),
  decision_maker: z.string().optional().describe('Who makes the purchasing decision (e.g., CEO, Manager)'),
  lead_score: z.number().min(0).max(100).optional().describe('Calculated lead score from 0-100 based on intent and fit'),
  lead_stage: z.enum([
    'new_lead',
    'cold',
    'warm',
    'hot',
    'qualified',
    'sales_ready',
    'customer'
  ]).optional().describe('The current stage of the lead'),
  conversation_summary: z.string().optional().describe('A brief summary of the conversation so far')
});

export const updateCrmContactTool = (db: SupabaseClient, contactId: string) => 
  tool({
    description: 'Updates a CRM contact profile with extracted information from the conversation. Call this when the user reveals their name, budget, requirements, or when their lead score/stage should be updated based on intent.',
    parameters: updateContactSchema,
    execute: async (args) => {
      if (Object.keys(args).length === 0) {
        return { success: false, message: 'No fields provided to update.' };
      }

      // Filter out undefined fields to avoid overwriting existing data with NULL
      const updateData = Object.fromEntries(
        Object.entries(args).filter(([_, v]) => v !== undefined)
      );

      const { error } = await db
        .from('contacts')
        .update(updateData)
        .eq('id', contactId);

      if (error) {
        console.error('[ai tool] update_crm_contact failed:', error);
        return { success: false, message: `Failed to update contact: ${error.message}` };
      }

      return { 
        success: true, 
        message: 'Successfully updated CRM contact profile.',
        updatedFields: Object.keys(updateData) 
      };
    },
  });
