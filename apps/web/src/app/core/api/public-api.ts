import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { PublicConfig } from '@lavio/shared';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../http/api';

export interface LeadInput {
  name: string;
  pressingName: string;
  phone: string;
  city?: string;
  message?: string;
  consent: boolean;
  /** Champ piège (laissé vide par les humains). */
  website?: string;
}

/** Appels publics de la landing (docs/07) : configuration et demande de contact. */
@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly http = inject(HttpClient);

  config(): Promise<PublicConfig> {
    return firstValueFrom(this.http.get<PublicConfig>(`${API_BASE}/public/config`));
  }

  createLead(body: LeadInput): Promise<{ ok: true }> {
    return firstValueFrom(this.http.post<{ ok: true }>(`${API_BASE}/public/leads`, body));
  }
}
