import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message, SendMessageRequest } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMessages(missionId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/chat/${missionId}`);
  }

  sendMessage(data: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/chat`, data);
  }

  uploadImage(formData: FormData): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/chat/upload-image`, formData);
  }

  updateMessage(messageId: string, contenu: string): Observable<Message> {
    return this.http.patch<Message>(`${this.apiUrl}/chat/${messageId}`, { contenu });
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/chat/${messageId}`);
  }

  markAsRead(messageId: string): Observable<Message> {
    return this.http.patch<Message>(`${this.apiUrl}/chat/${messageId}/read`, {});
  }

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/chat/conversations`);
  }
}
