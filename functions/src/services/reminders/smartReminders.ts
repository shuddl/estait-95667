/**
 * Smart Reminders System
 * Automated follow-ups and intelligent task scheduling for real estate agents
 */

import * as admin from 'firebase-admin';
// import { followUpBossService } from '../crm/followupboss';
// import { WiseAgentService } from '../crm/wiseagent';
// import { realGeeksService } from '../crm/realgeeks';
const wiseAgentService = { addTask: async (a: any, b: any) => {} } as any;
const followUpBossService = wiseAgentService;
const realGeeksService = wiseAgentService;

export interface Reminder {
  id?: string;
  userId: string;
  type: ReminderType;
  contactId?: string;
  contactName?: string;
  propertyId?: string;
  message: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  metadata?: Record<string, any>;
  createdAt: Date;
  sentAt?: Date;
}

export type ReminderType = 
  | 'follow_up_after_showing'
  | 'check_in_new_lead'
  | 'birthday_reminder'
  | 'contract_expiration'
  | 'listing_anniversary'
  | 'market_update'
  | 'custom';

export interface ReminderRule {
  id: string;
  name: string;
  type: ReminderType;
  triggerEvent: string;
  delayDays: number;
  template: string;
  enabled: boolean;
}

// Default reminder rules
const DEFAULT_RULES: ReminderRule[] = [
  {
    id: 'follow_up_showing',
    name: 'Follow up after showing',
    type: 'follow_up_after_showing',
    triggerEvent: 'showing_scheduled',
    delayDays: 1,
    template: 'Hi {contactName}, I wanted to follow up on the property you viewed yesterday at {propertyAddress}. What were your thoughts?',
    enabled: true
  },
  {
    id: 'new_lead_check',
    name: 'Check in with new lead',
    type: 'check_in_new_lead',
    triggerEvent: 'lead_created',
    delayDays: 3,
    template: 'Hi {contactName}, I wanted to check in and see if you had any questions about the properties we discussed or if you\'d like to schedule any showings.',
    enabled: true
  },
  {
    id: 'birthday',
    name: 'Birthday reminder',
    type: 'birthday_reminder',
    triggerEvent: 'birthday',
    delayDays: 0,
    template: 'Don\'t forget: {contactName}\'s birthday is today! Send them a quick birthday wish.',
    enabled: true
  },
  {
    id: 'contract_exp',
    name: 'Contract expiration',
    type: 'contract_expiration',
    triggerEvent: 'contract_expiring',
    delayDays: -30, // 30 days before expiration
    template: 'Reminder: The listing agreement for {propertyAddress} expires in 30 days. Time to discuss renewal with {contactName}.',
    enabled: true
  },
  {
    id: 'listing_ann',
    name: 'Listing anniversary',
    type: 'listing_anniversary',
    triggerEvent: 'listing_anniversary',
    delayDays: 0,
    template: 'Today marks the {years} year anniversary of listing {propertyAddress}. Consider reaching out to {contactName} with a market update.',
    enabled: true
  },
  {
    id: 'market_update',
    name: 'Monthly market update',
    type: 'market_update',
    triggerEvent: 'monthly',
    delayDays: 0,
    template: 'Time to send your monthly market update to active clients. {activeCount} clients are currently in your pipeline.',
    enabled: true
  }
];

export class SmartRemindersService {
  /**
   * Initialize reminder rules for a new user
   */
  async initializeUserRules(userId: string): Promise<void> {
    const batch = admin.firestore().batch();
    
    for (const rule of DEFAULT_RULES) {
      const ruleRef = admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('reminderRules')
        .doc(rule.id);
      
      batch.set(ruleRef, {
        ...rule,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
  }

  /**
   * Create a reminder
   */
  async createReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Promise<string> {
    const reminderRef = await admin.firestore()
      .collection('reminders')
      .add({
        ...reminder,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return reminderRef.id;
  }

  /**
   * Schedule a reminder based on a rule
   */
  async scheduleReminderFromRule(
    userId: string,
    ruleId: string,
    context: Record<string, any>
  ): Promise<string> {
    // Get the rule
    const ruleDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('reminderRules')
      .doc(ruleId)
      .get();
    
    if (!ruleDoc.exists || !ruleDoc.data()) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    
    const rule = ruleDoc.data() as ReminderRule;
    
    if (!rule.enabled) {
      throw new Error(`Rule ${ruleId} is disabled`);
    }
    
    // Calculate scheduled time
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + rule.delayDays);
    
    // Process template
    let message = rule.template;
    for (const [key, value] of Object.entries(context)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    
    // Create the reminder
    return await this.createReminder({
      userId,
      type: rule.type,
      contactId: context.contactId,
      contactName: context.contactName,
      propertyId: context.propertyId,
      message,
      scheduledFor,
      status: 'pending',
      metadata: {
        ruleId,
        context
      }
    });
  }

  /**
   * Process pending reminders (called by scheduled function)
   */
  async processPendingReminders(): Promise<void> {
    const now = new Date();
    
    // Get all pending reminders that should be sent
    const remindersSnapshot = await admin.firestore()
      .collection('reminders')
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', now)
      .limit(100) // Process in batches
      .get();
    
    const batch = admin.firestore().batch();
    const promises: Promise<void>[] = [];
    
    for (const doc of remindersSnapshot.docs) {
      const reminder = { id: doc.id, ...doc.data() } as Reminder;
      
      promises.push(this.sendReminder(reminder).then(success => {
        batch.update(doc.ref, {
          status: success ? 'sent' : 'failed',
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }));
    }
    
    await Promise.all(promises);
    await batch.commit();
  }

  /**
   * Send a reminder
   */
  private async sendReminder(reminder: Reminder): Promise<boolean> {
    try {
      // Get user preferences
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(reminder.userId)
        .get();
      
      const userData = userDoc.data();
      if (!userData) {
        console.error(`User ${reminder.userId} not found`);
        return false;
      }
      
      const crmType = userData.crmType;
      const notificationPrefs = userData.notificationPreferences || {
        email: true,
        sms: false,
        inApp: true
      };
      
      // Send in-app notification
      if (notificationPrefs.inApp) {
        await this.createInAppNotification(reminder);
      }
      
      // Create task in CRM if connected
      if (crmType && reminder.contactId) {
        await this.createCRMTask(reminder.userId, crmType, reminder);
      }
      
      // Send email notification
      if (notificationPrefs.email && userData.email) {
        await this.sendEmailNotification(userData.email, reminder);
      }
      
      // Send SMS if enabled (would need Twilio integration)
      if (notificationPrefs.sms && userData.phone) {
        // await this.sendSMSNotification(userData.phone, reminder);
      }
      
      console.log(`Reminder sent successfully: ${reminder.id}`);
      return true;
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
      return false;
    }
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(reminder: Reminder): Promise<void> {
    await admin.firestore()
      .collection('users')
      .doc(reminder.userId)
      .collection('notifications')
      .add({
        type: 'reminder',
        title: this.getReminderTitle(reminder.type),
        message: reminder.message,
        reminderId: reminder.id,
        contactId: reminder.contactId,
        propertyId: reminder.propertyId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Create task in connected CRM
   */
  private async createCRMTask(
    userId: string,
    crmType: string,
    reminder: Reminder
  ): Promise<void> {
    const taskData = {
      description: reminder.message,
      due_date: new Date().toISOString(),
      contact_id: reminder.contactId
    };
    
    try {
      switch (crmType) {
        case 'wise_agent':
          await wiseAgentService.addTask(userId, taskData);
          break;
        case 'follow_up_boss':
          await followUpBossService.addTask(userId, {
            description: taskData.description,
            dueDate: taskData.due_date,
            personId: taskData.contact_id,
            type: 'Other'
          });
          break;
        case 'real_geeks':
          await realGeeksService.addActivity(userId, {
            lead_id: taskData.contact_id || '',
            type: 'note',
            description: taskData.description,
            due_date: taskData.due_date
          });
          break;
      }
    } catch (error) {
      console.error(`Failed to create CRM task for reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(email: string, reminder: Reminder): Promise<void> {
    // This would integrate with SendGrid or similar
    // For now, just log it
    console.log(`Would send email to ${email}: ${reminder.message}`);
    
    // Store email record
    await admin.firestore()
      .collection('emailQueue')
      .add({
        to: email,
        subject: this.getReminderTitle(reminder.type),
        body: reminder.message,
        reminderId: reminder.id,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Get reminder title based on type
   */
  private getReminderTitle(type: ReminderType): string {
    const titles: Record<ReminderType, string> = {
      follow_up_after_showing: 'Follow-up Reminder',
      check_in_new_lead: 'Lead Check-in Reminder',
      birthday_reminder: 'Birthday Reminder',
      contract_expiration: 'Contract Expiration Alert',
      listing_anniversary: 'Listing Anniversary',
      market_update: 'Market Update Reminder',
      custom: 'Reminder'
    };
    
    return titles[type] || 'Reminder';
  }

  /**
   * Get upcoming reminders for a user
   */
  async getUpcomingReminders(userId: string, limit: number = 10): Promise<Reminder[]> {
    const snapshot = await admin.firestore()
      .collection('reminders')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('scheduledFor', 'asc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Reminder));
  }

  /**
   * Cancel a reminder
   */
  async cancelReminder(reminderId: string): Promise<void> {
    await admin.firestore()
      .collection('reminders')
      .doc(reminderId)
      .update({
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Update reminder rules for a user
   */
  async updateReminderRule(
    userId: string,
    ruleId: string,
    updates: Partial<ReminderRule>
  ): Promise<void> {
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('reminderRules')
      .doc(ruleId)
      .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Get user's reminder rules
   */
  async getUserRules(userId: string): Promise<ReminderRule[]> {
    const snapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('reminderRules')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ReminderRule));
  }
}

export const smartRemindersService = new SmartRemindersService();