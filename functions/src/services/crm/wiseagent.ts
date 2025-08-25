import * as functions from "firebase-functions";
import { db } from "../../lib/firebase";
import { encryptToken, decryptToken } from "../../lib/security";
import axios from "axios";

const WISE_AGENT_API_BASE = "https://api.wiseagent.com/v2";

interface WiseAgentCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  lastContact?: Date;
}

export class WiseAgentService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getAccessToken(): Promise<string> {
    const doc = await db
      .collection("users")
      .doc(this.userId)
      .collection("credentials")
      .doc("wise_agent")
      .get();

    if (!doc.exists) {
      throw new Error("Wise Agent not connected");
    }

    const data = doc.data() as any;
    const encryptedToken = data.encryptedToken;
    const credentials = JSON.parse(decryptToken(encryptedToken)) as WiseAgentCredentials;

    // Check if token is expired
    if (Date.now() >= credentials.expires_at) {
      // Refresh the token
      const refreshed = await this.refreshToken(credentials.refresh_token);
      return refreshed.access_token;
    }

    return credentials.access_token;
  }

  private async refreshToken(refreshToken: string): Promise<WiseAgentCredentials> {
    try {
      const clientId = functions.config().wise_agent?.client_id;
      const clientSecret = functions.config().wise_agent?.client_secret;

      const response = await axios.post(
        "https://api.wiseagent.com/oauth/token",
        {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }
      );

      const newCredentials: WiseAgentCredentials = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refreshToken,
        expires_at: Date.now() + (response.data.expires_in * 1000),
      };

      // Save updated credentials
      await db
        .collection("users")
        .doc(this.userId)
        .collection("credentials")
        .doc("wise_agent")
        .update({
          encryptedToken: encryptToken(JSON.stringify(newCredentials)),
          updatedAt: new Date(),
        });

      return newCredentials;
    } catch (error) {
      console.error("Failed to refresh Wise Agent token:", error);
      throw new Error("Failed to refresh authentication");
    }
  }

  async createContact(contact: Contact): Promise<string> {
    const token = await this.getAccessToken();

    const response = await axios.post(
      `${WISE_AGENT_API_BASE}/contacts`,
      {
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone_number: contact.phone,
        notes: contact.notes,
        tags: contact.tags?.join(","),
        source: contact.source || "Estait AI",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.id;
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<void> {
    const token = await this.getAccessToken();

    const payload: any = {};
    if (updates.firstName) payload.first_name = updates.firstName;
    if (updates.lastName) payload.last_name = updates.lastName;
    if (updates.email) payload.email = updates.email;
    if (updates.phone) payload.phone_number = updates.phone;
    if (updates.notes) payload.notes = updates.notes;
    if (updates.tags) payload.tags = updates.tags.join(",");

    await axios.patch(
      `${WISE_AGENT_API_BASE}/contacts/${contactId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const token = await this.getAccessToken();

    const response = await axios.get(
      `${WISE_AGENT_API_BASE}/contacts/search`,
      {
        params: { q: query },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.contacts.map((c: any) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.phone_number,
      notes: c.notes,
      tags: c.tags?.split(",").filter(Boolean),
      source: c.source,
      lastContact: c.last_contact_date ? new Date(c.last_contact_date) : undefined,
    }));
  }

  async getContact(contactId: string): Promise<Contact> {
    const token = await this.getAccessToken();

    const response = await axios.get(
      `${WISE_AGENT_API_BASE}/contacts/${contactId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const c = response.data;
    return {
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.phone_number,
      notes: c.notes,
      tags: c.tags?.split(",").filter(Boolean),
      source: c.source,
      lastContact: c.last_contact_date ? new Date(c.last_contact_date) : undefined,
    };
  }

  async addNote(contactId: string, note: string): Promise<void> {
    const token = await this.getAccessToken();

    await axios.post(
      `${WISE_AGENT_API_BASE}/contacts/${contactId}/notes`,
      {
        note: note,
        created_at: new Date().toISOString(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  async createTask(contactId: string, task: {
    title: string;
    description?: string;
    dueDate?: Date;
    priority?: "low" | "medium" | "high";
  }): Promise<string> {
    const token = await this.getAccessToken();

    const response = await axios.post(
      `${WISE_AGENT_API_BASE}/tasks`,
      {
        contact_id: contactId,
        title: task.title,
        description: task.description,
        due_date: task.dueDate?.toISOString(),
        priority: task.priority || "medium",
        status: "pending",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.id;
  }

  async getTasks(contactId?: string): Promise<any[]> {
    const token = await this.getAccessToken();

    const params: any = {};
    if (contactId) params.contact_id = contactId;

    const response = await axios.get(
      `${WISE_AGENT_API_BASE}/tasks`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.tasks;
  }

  async completeTask(taskId: string): Promise<void> {
    const token = await this.getAccessToken();

    await axios.patch(
      `${WISE_AGENT_API_BASE}/tasks/${taskId}`,
      { status: "completed" },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  }
}