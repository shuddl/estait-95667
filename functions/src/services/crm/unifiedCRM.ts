import { WiseAgentService } from "./wiseagent";
import { db } from "../../lib/firebase";

export interface CRMContact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  lastContact?: Date;
  provider: string;
}

export interface CRMTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: "low" | "medium" | "high";
  status: "pending" | "completed";
  contactId?: string;
  provider: string;
}

export class UnifiedCRMService {
  private userId: string;
  private connectedProviders: string[] = [];

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize(): Promise<void> {
    // Check which CRMs are connected
    const userDoc = await db.collection("users").doc(this.userId).get();
    const userData = userDoc.data();
    
    if (userData?.connectedCRMs) {
      this.connectedProviders = Object.keys(userData.connectedCRMs)
        .filter(key => userData.connectedCRMs[key] === true);
    }
  }

  async createContact(contact: Omit<CRMContact, "id" | "provider">): Promise<string[]> {
    const results: string[] = [];

    // Create contact in all connected CRMs
    for (const provider of this.connectedProviders) {
      try {
        if (provider === "wise_agent") {
          const wiseAgent = new WiseAgentService(this.userId);
          const id = await wiseAgent.createContact({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            notes: contact.notes,
            tags: contact.tags,
            source: contact.source,
          });
          results.push(`${provider}:${id}`);
        }
        // Add other CRM providers here
      } catch (error) {
        console.error(`Failed to create contact in ${provider}:`, error);
      }
    }

    return results;
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    const allContacts: CRMContact[] = [];

    for (const provider of this.connectedProviders) {
      try {
        if (provider === "wise_agent") {
          const wiseAgent = new WiseAgentService(this.userId);
          const contacts = await wiseAgent.searchContacts(query);
          allContacts.push(...contacts.map(c => ({
            ...c,
            id: c.id || "",
            provider: "wise_agent",
          })));
        }
        // Add other CRM providers here
      } catch (error) {
        console.error(`Failed to search contacts in ${provider}:`, error);
      }
    }

    // Remove duplicates based on email
    const uniqueContacts = new Map<string, CRMContact>();
    for (const contact of allContacts) {
      const key = contact.email || `${contact.firstName}-${contact.lastName}`;
      if (!uniqueContacts.has(key)) {
        uniqueContacts.set(key, contact);
      }
    }

    return Array.from(uniqueContacts.values());
  }

  async updateContact(
    provider: string,
    contactId: string,
    updates: Partial<CRMContact>
  ): Promise<void> {
    if (provider === "wise_agent") {
      const wiseAgent = new WiseAgentService(this.userId);
      await wiseAgent.updateContact(contactId, updates);
    }
    // Add other CRM providers here
  }

  async addNote(provider: string, contactId: string, note: string): Promise<void> {
    if (provider === "wise_agent") {
      const wiseAgent = new WiseAgentService(this.userId);
      await wiseAgent.addNote(contactId, note);
    }
    // Add other CRM providers here
  }

  async createTask(task: Omit<CRMTask, "id" | "provider" | "status">): Promise<string[]> {
    const results: string[] = [];

    for (const provider of this.connectedProviders) {
      try {
        if (provider === "wise_agent" && task.contactId) {
          const wiseAgent = new WiseAgentService(this.userId);
          const id = await wiseAgent.createTask(task.contactId, {
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
          });
          results.push(`${provider}:${id}`);
        }
        // Add other CRM providers here
      } catch (error) {
        console.error(`Failed to create task in ${provider}:`, error);
      }
    }

    return results;
  }

  async getTasks(contactId?: string): Promise<CRMTask[]> {
    const allTasks: CRMTask[] = [];

    for (const provider of this.connectedProviders) {
      try {
        if (provider === "wise_agent") {
          const wiseAgent = new WiseAgentService(this.userId);
          const tasks = await wiseAgent.getTasks(contactId);
          allTasks.push(...tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            dueDate: t.due_date ? new Date(t.due_date) : undefined,
            priority: t.priority,
            status: t.status,
            contactId: t.contact_id,
            provider: "wise_agent",
          })));
        }
        // Add other CRM providers here
      } catch (error) {
        console.error(`Failed to get tasks from ${provider}:`, error);
      }
    }

    return allTasks;
  }

  async completeTask(provider: string, taskId: string): Promise<void> {
    if (provider === "wise_agent") {
      const wiseAgent = new WiseAgentService(this.userId);
      await wiseAgent.completeTask(taskId);
    }
    // Add other CRM providers here
  }

  getConnectedProviders(): string[] {
    return this.connectedProviders;
  }

  isConnected(): boolean {
    return this.connectedProviders.length > 0;
  }
}