import { Injectable, signal } from '@angular/core';

export interface SearchDraft {
  readonly city: string;
  readonly area: string;
  readonly type: string;
  readonly maxPrice: string;
  readonly sharingType: string;
}

export const EMPTY_SEARCH: SearchDraft = {
  city: '',
  area: '',
  type: '',
  maxPrice: '',
  sharingType: '',
};

@Injectable({ providedIn: 'root' })
export class SearchUiService {
  readonly open = signal(false);
  readonly draft = signal<SearchDraft>(EMPTY_SEARCH);

  show(draft: Partial<SearchDraft> = {}): void {
    this.draft.set({ ...EMPTY_SEARCH, ...draft });
    this.open.set(true);
  }

  hide(): void {
    this.open.set(false);
  }
}
