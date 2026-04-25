import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AcknowledgementType, DocumentDTO, PaginatedResponse, SignedDownloadLink,
  DeliveryDTO, AcknowledgementResultDTO, BatchAcknowledgementResult, BatchItemResult
} from '../../models/document.model';
import { AuthService } from '../../services/auth.service';
import { DocumentService } from '../../services/document.service';
import { TranslationService } from '../../services/translation.service';

type EndpointDefinition = {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  descriptionKey: string;
  accessKey: string;
  accent: string;
};

@Component({
  selector: 'app-client-api-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">

      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <p class="text-[10px] text-on-surface-variant font-bold tracking-[0.28em] uppercase mb-1">{{ t('clientApi.badge') }}</p>
          <h2 class="text-4xl font-black tracking-tight text-on-surface">
            {{ isVaut() ? t('clientApi.adminTitle') : t('clientApi.etlTitle') }}
          </h2>
          <p class="text-on-surface-variant font-medium mt-1 max-w-3xl">
            {{ isVaut() ? t('clientApi.adminSubtitle') : t('clientApi.etlSubtitle') }}
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm min-w-[280px]">
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{{ t('clientApi.session') }}</p>
          <p class="mt-2 text-lg font-bold text-slate-950">{{ user()?.fullName || user()?.username }}</p>
          <p class="text-sm text-slate-500">{{ user()?.role }}</p>
        </div>
      </div>

      <!-- ── Scope cards ─────────────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4" [class.md:grid-cols-4]="isVaut()">
        <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{{ t('clientApi.issuerScope') }}</p>
          <p class="mt-3 text-2xl font-black text-slate-950">{{ issuerScope() }}</p>
        </div>
        <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{{ t('clientApi.entityScope') }}</p>
          <p class="mt-3 text-2xl font-black text-slate-950">{{ entityScope() }}</p>
        </div>
        <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{{ t('clientApi.ackCapability') }}</p>
          <p class="mt-3 text-2xl font-black text-emerald-700">{{ t('clientApi.enabled') }}</p>
        </div>
        <div *ngIf="isVaut()" class="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{{ t('clientApi.uploadCapability') }}</p>
          <p class="mt-3 text-2xl font-black text-amber-700">{{ t('clientApi.vautOnly') }}</p>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!--  CLIENT VIEW — ETL workflow (ROLE_USER only)          -->
      <!-- ══════════════════════════════════════════════════════ -->
      <ng-container *ngIf="!isVaut()">

        <!-- Protocol overview -->
        <section class="rounded-[28px] border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div class="flex items-center gap-3 mb-4">
            <span class="material-symbols-outlined text-blue-600 text-3xl">route</span>
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">{{ t('clientApi.catalogBadge') }}</p>
              <h3 class="text-xl font-black text-blue-900">{{ t('clientApi.etlFlowTitle') }}</h3>
            </div>
          </div>
          <p class="text-sm text-blue-800 mb-4">{{ t('clientApi.etlFlowDesc') }}</p>
          <div class="space-y-2">
            <div class="flex items-start gap-3">
              <span class="flex-none w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">1</span>
              <code class="text-sm text-blue-900">{{ t('clientApi.etlFlowStep1') }}</code>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-none w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
              <code class="text-sm text-blue-900">{{ t('clientApi.etlFlowStep2') }}</code>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-none w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">3</span>
              <code class="text-sm text-blue-900">{{ t('clientApi.etlFlowStep3') }}</code>
            </div>
          </div>
        </section>

        <!-- ── STEP 1 : Get deliveries ─────────────────────── -->
        <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.18em] uppercase text-white bg-blue-600 mb-2">
                {{ t('clientApi.step1Badge') }}
              </span>
              <h3 class="text-2xl font-black text-slate-950">{{ t('clientApi.step1Title') }}</h3>
              <code class="text-xs text-slate-500 mt-1 block">GET /api/v1/deliveries?since=&amp;cursor=&amp;limit=&amp;entityCode=</code>
            </div>
            <span class="material-symbols-outlined text-3xl text-blue-400">inbox</span>
          </div>
          <p class="text-sm text-slate-600">{{ t('clientApi.step1Desc') }}</p>
          <div class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex gap-2">
            <span class="material-symbols-outlined text-blue-500 text-base flex-none mt-0.5">lightbulb</span>
            <p class="text-xs text-blue-800">{{ t('clientApi.step1Tip') }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('clientApi.since') }}</label>
              <input [(ngModel)]="deliveriesForm.since" name="delivSince"
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                [placeholder]="t('clientApi.sincePlaceholder')" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('clientApi.entityOptional') }}</label>
              <input [(ngModel)]="deliveriesForm.entityCode" name="delivEntity"
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                [placeholder]="t('clientApi.entityOptional')" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('common.limit') }}</label>
              <input [(ngModel)]="deliveriesForm.limit" name="delivLimit" type="number" min="1" max="2000"
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" (click)="getDeliveries()" [disabled]="deliveriesLoading"
              class="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold disabled:opacity-60">
              {{ deliveriesLoading ? t('clientApi.loading') : t('clientApi.getDeliveriesAction') }}
            </button>
            <button type="button" (click)="prefillFromDelivery()" [disabled]="!deliveriesResponse?.items?.length"
              class="px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50 text-sm font-bold text-blue-800 disabled:opacity-50">
              {{ t('clientApi.prefillFromDelivery') }} {{ t('clientApi.prefillSuffix') }}
            </button>
          </div>
          <div class="rounded-2xl bg-slate-950 text-slate-100 p-4 overflow-x-auto">
            <p class="text-[10px] uppercase tracking-[0.24em] text-slate-400 mb-2">{{ t('clientApi.curlPreview') }}</p>
            <pre class="text-xs whitespace-pre-wrap">{{ deliveriesCurl() }}</pre>
          </div>
          <div *ngIf="deliveriesError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ deliveriesError }}</div>
          <div *ngIf="deliveriesResponse">
            <div class="flex items-center justify-between gap-3 mb-3">
              <p class="text-sm font-bold text-slate-900">
                {{ deliveriesResponse.totalCount }} {{ t('clientApi.deliveriesFound') }}
                <span *ngIf="deliveriesResponse.hasMore" class="ml-2 text-amber-600 font-normal text-xs">{{ t('clientApi.hasMore') }}</span>
              </p>
            </div>
            <div class="space-y-2" *ngIf="deliveriesResponse.items.length; else noDeliveries">
              <div *ngFor="let d of deliveriesResponse.items | slice:0:5"
                class="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><p class="text-slate-400 font-bold uppercase">fileId</p><p class="font-semibold text-slate-800 break-all">{{ d.fileId }}</p></div>
                <div><p class="text-slate-400 font-bold uppercase">status</p><p class="font-semibold text-slate-800">{{ d.status }}</p></div>
                <div><p class="text-slate-400 font-bold uppercase">size</p><p class="font-semibold text-slate-800">{{ d.size != null ? (d.size | number) + ' B' : '—' }}</p></div>
                <div><p class="text-slate-400 font-bold uppercase">sha256</p><p class="font-mono text-slate-600 truncate">{{ d.sha256 ? d.sha256.substring(0,16) + '…' : '—' }}</p></div>
              </div>
            </div>
            <ng-template #noDeliveries>
              <p class="text-sm text-slate-500">{{ t('clientApi.noDeliveries') }}</p>
            </ng-template>
          </div>
        </section>

        <!-- ── STEP 2 : Direct download ───────────────────── -->
        <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.18em] uppercase text-white bg-emerald-600 mb-2">
                {{ t('clientApi.step2Badge') }}
              </span>
              <h3 class="text-2xl font-black text-slate-950">{{ t('clientApi.step2Title') }}</h3>
              <code class="text-xs text-slate-500 mt-1 block">GET /api/v1/documents/&#123;documentId&#125;/content</code>
            </div>
            <span class="material-symbols-outlined text-3xl text-emerald-400">download</span>
          </div>
          <p class="text-sm text-slate-600">{{ t('clientApi.step2Desc') }}</p>
          <div class="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex gap-2">
            <span class="material-symbols-outlined text-emerald-600 text-base flex-none mt-0.5">verified</span>
            <p class="text-xs text-emerald-800">{{ t('clientApi.step2Tip') }}</p>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('docList.colDocId') }}</label>
            <input [(ngModel)]="directDownloadForm.documentId" name="dlDocId"
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              [placeholder]="t('clientApi.documentIdPlaceholder')" />
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" (click)="downloadDirect()" [disabled]="directDownloadLoading"
              class="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold disabled:opacity-60">
              {{ directDownloadLoading ? t('clientApi.loading') : t('clientApi.downloadDirectAction') }}
            </button>
          </div>
          <div class="rounded-2xl bg-slate-950 text-slate-100 p-4 overflow-x-auto">
            <p class="text-[10px] uppercase tracking-[0.24em] text-slate-400 mb-2">{{ t('clientApi.curlPreview') }}</p>
            <pre class="text-xs whitespace-pre-wrap">{{ directDownloadCurl() }}</pre>
          </div>
          <div *ngIf="directDownloadError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ directDownloadError }}</div>
          <div *ngIf="directDownloadSuccess" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ directDownloadSuccess }}</div>
        </section>

        <!-- ── STEP 3 : Idempotent ACK ─────────────────────── -->
        <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.18em] uppercase text-white bg-amber-600 mb-2">
                {{ t('clientApi.step3Badge') }}
              </span>
              <h3 class="text-2xl font-black text-slate-950">{{ t('clientApi.step3Title') }}</h3>
              <code class="text-xs text-slate-500 mt-1 block">PUT /api/v1/documents/&#123;documentId&#125;/acknowledgement</code>
            </div>
            <span class="material-symbols-outlined text-3xl text-amber-400">task_alt</span>
          </div>
          <p class="text-sm text-slate-600">{{ t('clientApi.step3Desc') }}</p>
          <div class="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 flex gap-2">
            <span class="material-symbols-outlined text-amber-600 text-base flex-none mt-0.5">account_tree</span>
            <p class="text-xs text-amber-800 font-mono">{{ t('clientApi.step3Tip') }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('docList.colDocId') }}</label>
              <input [(ngModel)]="idempotentAckForm.documentId" name="iAckDocId"
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                [placeholder]="t('clientApi.documentIdPlaceholder')" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('docList.type') }}</label>
              <select [(ngModel)]="idempotentAckForm.ackType" name="iAckType"
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white">
                <option *ngFor="let t of ackTypes" [value]="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('clientApi.idempotencyKey') }}</label>
            <div class="flex gap-2">
              <input [(ngModel)]="idempotentAckForm.idempotencyKey" name="iAckKey"
                class="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <button type="button" (click)="generateUuid()" title="Generate UUID"
                class="px-3 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">
                <span class="material-symbols-outlined text-base">refresh</span>
              </button>
            </div>
            <p class="text-[10px] text-slate-400">{{ t('clientApi.idempotencyKeyHint') }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('clientApi.externalRef') }}</label>
              <input [(ngModel)]="idempotentAckForm.externalReference" name="iAckRef"
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                [placeholder]="t('clientApi.externalRef')" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('clientApi.comment') }}</label>
              <input [(ngModel)]="idempotentAckForm.comment" name="iAckComment"
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                [placeholder]="t('clientApi.comment')" />
            </div>
          </div>
          <button type="button" (click)="sendIdempotentAck()" [disabled]="idempotentAckLoading"
            class="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold disabled:opacity-60">
            {{ idempotentAckLoading ? t('clientApi.loading') : t('clientApi.sendAckAction') }}
          </button>
          <div class="rounded-2xl bg-slate-950 text-slate-100 p-4 overflow-x-auto">
            <p class="text-[10px] uppercase tracking-[0.24em] text-slate-400 mb-2">{{ t('clientApi.curlPreview') }}</p>
            <pre class="text-xs whitespace-pre-wrap">{{ idempotentAckCurl() }}</pre>
          </div>
          <div *ngIf="idempotentAckError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ idempotentAckError }}</div>
          <div *ngIf="ackResult">
            <div class="rounded-xl border px-4 py-3 text-sm"
              [class.border-emerald-200]="!ackResult.alreadyApplied" [class.bg-emerald-50]="!ackResult.alreadyApplied" [class.text-emerald-800]="!ackResult.alreadyApplied"
              [class.border-blue-200]="ackResult.alreadyApplied" [class.bg-blue-50]="ackResult.alreadyApplied" [class.text-blue-800]="ackResult.alreadyApplied">
              {{ ackResult.alreadyApplied ? t('clientApi.alreadyApplied') : t('clientApi.ackCreated') }}
              — status: <strong>{{ ackResult.status }}</strong>, appliedAt: {{ ackResult.appliedAt | date:'medium' }}
            </div>
          </div>
        </section>

        <!-- ── Batch ACK (advanced) ────────────────────────── -->
        <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.18em] uppercase text-white bg-purple-600 mb-2">
                {{ t('clientApi.batchBadge') }}
              </span>
              <h3 class="text-2xl font-black text-slate-950">{{ t('clientApi.batchTitle') }}</h3>
              <code class="text-xs text-slate-500 mt-1 block">POST /api/v1/acknowledgements/batch · 207 Multi-Status</code>
            </div>
            <span class="material-symbols-outlined text-3xl text-purple-400">playlist_add_check</span>
          </div>
          <p class="text-sm text-slate-600">{{ t('clientApi.batchDesc') }}</p>
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ t('clientApi.batchJsonLabel') }}</label>
              <button type="button" (click)="prefillBatchJson()"
                class="text-xs font-bold text-purple-700 hover:underline">{{ t('clientApi.prefillBatch') }}</button>
            </div>
            <textarea [(ngModel)]="batchPayload" name="batchPayload" rows="8"
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-mono resize-y"
              placeholder='&#123;"items":[&#123;"documentId":"DOC_001","ackType":"AR3","idempotencyKey":"uuid-here"&#125;]&#125;'></textarea>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" (click)="runBatch()" [disabled]="batchLoading"
              class="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold disabled:opacity-60">
              {{ batchLoading ? t('clientApi.loading') : t('clientApi.runBatchAction') }}
            </button>
          </div>
          <div class="rounded-2xl bg-slate-950 text-slate-100 p-4 overflow-x-auto">
            <p class="text-[10px] uppercase tracking-[0.24em] text-slate-400 mb-2">{{ t('clientApi.curlPreview') }}</p>
            <pre class="text-xs whitespace-pre-wrap">{{ batchCurl() }}</pre>
          </div>
          <div *ngIf="batchError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ batchError }}</div>
          <div *ngIf="batchResult">
            <div class="flex items-center gap-4 mb-3">
              <p class="text-sm font-bold text-slate-900">{{ t('clientApi.batchResultsTitle') }}</p>
              <span class="text-xs text-emerald-700 font-semibold">✓ {{ batchResult.succeeded }} OK</span>
              <span *ngIf="batchResult.failed" class="text-xs text-rose-700 font-semibold">✗ {{ batchResult.failed }} erreurs</span>
            </div>
            <div class="space-y-2">
              <div *ngFor="let item of batchResult.items" class="rounded-xl border px-4 py-2 text-xs flex items-center gap-4"
                [class.border-emerald-200]="item.resultStatus === 'OK'" [class.bg-emerald-50]="item.resultStatus === 'OK'"
                [class.border-blue-200]="item.resultStatus === 'ALREADY_APPLIED'" [class.bg-blue-50]="item.resultStatus === 'ALREADY_APPLIED'"
                [class.border-rose-200]="item.resultStatus === 'ERROR'" [class.bg-rose-50]="item.resultStatus === 'ERROR'">
                <span class="font-black w-28">{{ item.resultStatus }}</span>
                <span class="font-mono text-slate-700">{{ item.documentId }}</span>
                <span *ngIf="item.errorMessage" class="text-rose-700">{{ item.errorMessage }}</span>
              </div>
            </div>
          </div>
        </section>

      </ng-container>
      <!-- end CLIENT VIEW -->

      <!-- ══════════════════════════════════════════════════════ -->
      <!--  ADMIN VIEW — VAUT only                               -->
      <!-- ══════════════════════════════════════════════════════ -->
      <ng-container *ngIf="isVaut()">
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <!-- Search -->
          <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{{ t('clientApi.searchBadge') }}</p>
                <h3 class="text-2xl font-black text-slate-950">{{ t('clientApi.searchTitle') }}</h3>
              </div>
              <span class="material-symbols-outlined text-3xl text-sky-400">travel_explore</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input [(ngModel)]="searchForm.q" name="searchQuery" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" [placeholder]="t('clientApi.searchPlaceholder')" />
              <input [(ngModel)]="searchForm.entityCode" name="searchEntity" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" [placeholder]="t('clientApi.entityOptional')" />
              <input [(ngModel)]="searchForm.limit" name="searchLimit" type="number" min="1" max="100" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            </div>
            <div class="flex flex-wrap gap-3">
              <button type="button" (click)="runSearch()" [disabled]="searchLoading" class="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold disabled:opacity-60">
                {{ searchLoading ? t('clientApi.loading') : t('clientApi.searchAction') }}
              </button>
              <button type="button" (click)="useFirstSearchResult()" [disabled]="!searchResponse?.items?.length" class="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-50">
                {{ t('clientApi.prefillFromResult') }}
              </button>
            </div>
            <div class="rounded-2xl bg-slate-950 text-slate-100 p-4 overflow-x-auto">
              <p class="text-[10px] uppercase tracking-[0.24em] text-slate-400 mb-2">{{ t('clientApi.curlPreview') }}</p>
              <pre class="text-xs whitespace-pre-wrap">{{ searchCurl() }}</pre>
            </div>
            <div *ngIf="searchError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ searchError }}</div>
            <div *ngIf="searchResponse" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-bold text-slate-900">{{ searchResponse.totalCount }} {{ t('clientApi.results') }}</p>
              </div>
              <div class="space-y-2" *ngIf="searchResponse.items.length; else emptySearch">
                <div *ngFor="let doc of searchResponse.items | slice:0:5" class="rounded-xl bg-white border border-slate-200 px-4 py-3">
                  <p class="font-semibold text-slate-900 break-all">{{ doc.documentId }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ doc.issuerCode }} / {{ doc.entityCode }} / {{ doc.type }} / {{ doc.status }}</p>
                </div>
              </div>
              <ng-template #emptySearch><p class="text-sm text-slate-500">{{ t('clientApi.noResults') }}</p></ng-template>
            </div>
          </section>

          <!-- Upload -->
          <section class="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{{ t('clientApi.uploadBadge') }}</p>
                <h3 class="text-2xl font-black text-slate-950">{{ t('clientApi.uploadTitle') }}</h3>
              </div>
              <span class="material-symbols-outlined text-3xl text-amber-500">upload_file</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input [(ngModel)]="uploadForm.destinataire" name="uploadIssuer" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" [placeholder]="t('clientApi.issuerPlaceholder')" />
              <input [(ngModel)]="uploadForm.entity" name="uploadEntity" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" [placeholder]="t('clientApi.entityCodePlaceholder')" />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select [(ngModel)]="uploadForm.type" name="uploadType" class="rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white">
                <option *ngFor="let type of documentTypes" [value]="type">{{ type }}</option>
              </select>
              <select [(ngModel)]="uploadForm.statut" name="uploadStatus" class="rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white">
                <option *ngFor="let status of uploadStatuses" [value]="status">{{ status }}</option>
              </select>
              <input type="file" (change)="onFileSelected($event)" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            </div>
            <button type="button" (click)="uploadDocument()" [disabled]="uploadLoading" class="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold disabled:opacity-60">
              {{ uploadLoading ? t('clientApi.loading') : t('clientApi.uploadAction') }}
            </button>
            <div class="rounded-2xl bg-slate-950 text-slate-100 p-4 overflow-x-auto">
              <p class="text-[10px] uppercase tracking-[0.24em] text-slate-400 mb-2">{{ t('clientApi.curlPreview') }}</p>
              <pre class="text-xs whitespace-pre-wrap">{{ uploadCurl() }}</pre>
            </div>
            <div *ngIf="uploadError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ uploadError }}</div>
            <div *ngIf="uploadSuccess" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ uploadSuccess }}</div>
          </section>

          <!-- Legacy ACK (portal) -->
          <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{{ t('clientApi.ackBadge') }}</p>
                <h3 class="text-2xl font-black text-slate-950">{{ t('clientApi.ackTitle') }}</h3>
                <code class="text-xs text-slate-400 block mt-1">POST /api/v1/entities/&#123;entityCode&#125;/documents/&#123;documentId&#125;/acknowledgements</code>
              </div>
              <span class="material-symbols-outlined text-3xl text-amber-400">task_alt</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input [(ngModel)]="ackForm.entityCode" name="ackEntityCode" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" [placeholder]="t('clientApi.entityCodePlaceholder')" />
              <input [(ngModel)]="ackForm.documentId" name="ackDocumentId" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" [placeholder]="t('clientApi.documentIdPlaceholder')" />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select [(ngModel)]="ackForm.type" name="ackType" class="rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white">
                <option *ngFor="let type of ackTypes" [value]="type">{{ type }}</option>
              </select>
              <input [(ngModel)]="ackForm.details" name="ackDetails" class="rounded-xl border border-slate-200 px-4 py-3 text-sm" [placeholder]="t('clientApi.ackDetailsPlaceholder')" />
            </div>
            <button type="button" (click)="sendAcknowledgement()" [disabled]="ackLoading" class="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold disabled:opacity-60">
              {{ ackLoading ? t('clientApi.loading') : t('clientApi.ackAction') }}
            </button>
            <div class="rounded-2xl bg-slate-950 text-slate-100 p-4 overflow-x-auto">
              <p class="text-[10px] uppercase tracking-[0.24em] text-slate-400 mb-2">{{ t('clientApi.curlPreview') }}</p>
              <pre class="text-xs whitespace-pre-wrap">{{ ackCurl() }}</pre>
            </div>
            <div *ngIf="ackError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ ackError }}</div>
            <div *ngIf="ackSuccess" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ ackSuccess }}</div>
          </section>

        </div>
      </ng-container>
      <!-- end ADMIN VIEW -->

      <!-- ── Endpoint catalog (filtered by role) ──────────── -->
      <section class="space-y-4">
        <div>
          <p class="text-[10px] text-on-surface-variant font-bold tracking-[0.24em] uppercase mb-1">{{ t('clientApi.catalogBadge') }}</p>
          <h3 class="text-2xl font-black tracking-tight text-on-surface">{{ t('clientApi.catalogTitle') }}</h3>
        </div>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <article *ngFor="let endpoint of visibleEndpoints" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden relative">
            <div class="absolute inset-x-0 top-0 h-1" [style.background]="endpoint.accent"></div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.18em] uppercase text-white mb-3" [style.background]="endpoint.accent">
                  {{ endpoint.method }}
                </div>
                <code class="block text-sm font-semibold text-slate-900 break-all">{{ endpoint.path }}</code>
              </div>
              <span class="material-symbols-outlined text-slate-300">terminal</span>
            </div>
            <p class="mt-4 text-sm text-slate-600">{{ t(endpoint.descriptionKey) }}</p>
            <p class="mt-3 text-xs font-semibold text-slate-500">{{ t(endpoint.accessKey) }}</p>
          </article>
        </div>
      </section>

    </div>
  `
})
export class ClientApiConsoleComponent {
  protected readonly user;

  protected readonly clientEndpoints: EndpointDefinition[] = [
    { method: 'GET', path: '/api/v1/deliveries?since={ts}&cursor={c}&limit={n}', descriptionKey: 'clientApi.endpointDeliveries', accessKey: 'clientApi.accessEtlRead', accent: '#2563eb' },
    { method: 'GET', path: '/api/v1/deliveries/export?since={ts}&format=jsonl|csv', descriptionKey: 'clientApi.endpointDeliveriesExport', accessKey: 'clientApi.accessEtlRead', accent: '#0891b2' },
    { method: 'GET', path: '/api/v1/documents/{documentId}/content', descriptionKey: 'clientApi.endpointDirectDownload', accessKey: 'clientApi.accessEtlRead', accent: '#059669' },
    { method: 'PUT', path: '/api/v1/documents/{documentId}/acknowledgement', descriptionKey: 'clientApi.endpointAckPut', accessKey: 'clientApi.accessEtlWrite', accent: '#d97706' },
    { method: 'POST', path: '/api/v1/acknowledgements/batch', descriptionKey: 'clientApi.endpointAckBatch', accessKey: 'clientApi.accessEtlWrite', accent: '#7c3aed' },
  ];

  protected readonly adminEndpoints: EndpointDefinition[] = [
    { method: 'GET', path: '/api/v1/search?q={query}', descriptionKey: 'clientApi.endpointSearch', accessKey: 'clientApi.accessScopedRead', accent: '#0f766e' },
    { method: 'POST', path: '/api/v1/entities/{entityCode}/documents/{documentId}/acknowledgements', descriptionKey: 'clientApi.endpointAckPost', accessKey: 'clientApi.accessScopedWrite', accent: '#c2410c' },
    { method: 'POST', path: '/api/v1/documents/upload', descriptionKey: 'clientApi.endpointUpload', accessKey: 'clientApi.accessVautOnly', accent: '#b91c1c' },
  ];

  protected get visibleEndpoints(): EndpointDefinition[] {
    return this.isVaut() ? [...this.adminEndpoints, ...this.clientEndpoints] : this.clientEndpoints;
  }

  protected readonly ackTypes: AcknowledgementType[] = [AcknowledgementType.AR2, AcknowledgementType.AR3, AcknowledgementType.AR4];
  protected readonly documentTypes = ['FTIS', 'VTIS', 'PTIS', 'CRMENS'];
  protected readonly uploadStatuses = ['ALIRE', 'AR2', 'AR3', 'AR4'];

  // ── Client (ETL) forms ──────────────────────────────────────
  protected deliveriesForm = { since: '', entityCode: '', limit: 100 };
  protected directDownloadForm = { documentId: '' };
  protected idempotentAckForm = {
    documentId: '', ackType: AcknowledgementType.AR3,
    idempotencyKey: '', externalReference: '', comment: ''
  };
  protected batchPayload = '';

  // ── Admin (VAUT) forms ──────────────────────────────────────
  protected searchForm = { q: '', entityCode: '', limit: 10 };
  protected ackForm = { entityCode: '', documentId: '', type: AcknowledgementType.AR3, details: '' };
  protected uploadForm = { destinataire: '', entity: '', type: 'FTIS', statut: 'ALIRE' };

  // ── Loading states ─────────────────────────────────────────
  protected deliveriesLoading = false;
  protected directDownloadLoading = false;
  protected idempotentAckLoading = false;
  protected batchLoading = false;
  protected searchLoading = false;
  protected ackLoading = false;
  protected uploadLoading = false;

  // ── Error/success ─────────────────────────────────────────
  protected deliveriesError = '';
  protected directDownloadError = '';
  protected directDownloadSuccess = '';
  protected idempotentAckError = '';
  protected batchError = '';
  protected searchError = '';
  protected ackError = '';
  protected ackSuccess = '';
  protected uploadError = '';
  protected uploadSuccess = '';

  // ── Results ───────────────────────────────────────────────
  protected deliveriesResponse: { items: DeliveryDTO[]; totalCount: number; hasMore: boolean; nextCursor: string | null } | null = null;
  protected ackResult: AcknowledgementResultDTO | null = null;
  protected batchResult: BatchAcknowledgementResult | null = null;
  protected searchResponse: PaginatedResponse<DocumentDTO> | null = null;
  private uploadFile: File | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly documentService: DocumentService,
    private readonly translationService: TranslationService
  ) {
    this.user = this.authService.user;
    this.generateUuid();
  }

  t(key: string): string { return this.translationService.t(key); }

  issuerScope(): string { return this.user()?.allowedIssuer ?? this.t('clientApi.allIssuers'); }
  entityScope(): string { return this.user()?.legalEntityCode ?? this.t('clientApi.allEntities'); }
  isVaut(): boolean { return this.user()?.username?.toUpperCase() === 'VAUT'; }

  // ── ETL: Step 1 ───────────────────────────────────────────
  getDeliveries(): void {
    this.deliveriesError = '';
    this.deliveriesResponse = null;
    this.deliveriesLoading = true;
    const params: Record<string, string | number | undefined> = { limit: this.deliveriesForm.limit };
    if (this.deliveriesForm.since) params['since'] = this.deliveriesForm.since;
    if (this.deliveriesForm.entityCode) params['entityCode'] = this.deliveriesForm.entityCode;
    this.documentService.getDeliveries(params as any).pipe(finalize(() => { this.deliveriesLoading = false; })).subscribe({
      next: r => { this.deliveriesResponse = r; },
      error: e => { this.deliveriesError = this.extractError(e); }
    });
  }

  prefillFromDelivery(): void {
    const first = this.deliveriesResponse?.items?.[0];
    if (!first) return;
    this.directDownloadForm.documentId = first.fileId;
    this.idempotentAckForm.documentId = first.fileId;
    this.generateUuid();
  }

  // ── ETL: Step 2 ───────────────────────────────────────────
  downloadDirect(): void {
    this.directDownloadError = '';
    this.directDownloadSuccess = '';
    const documentId = this.directDownloadForm.documentId.trim();
    if (!documentId) { this.directDownloadError = this.t('clientApi.documentRequired'); return; }
    this.directDownloadLoading = true;
    this.documentService.downloadContent(documentId).pipe(finalize(() => { this.directDownloadLoading = false; })).subscribe({
      next: blob => {
        this.saveBlob(blob, documentId);
        this.directDownloadSuccess = this.t('clientApi.downloadReady');
      },
      error: e => { this.directDownloadError = this.extractError(e); }
    });
  }

  // ── ETL: Step 3 ───────────────────────────────────────────
  sendIdempotentAck(): void {
    this.idempotentAckError = '';
    this.ackResult = null;
    const documentId = this.idempotentAckForm.documentId.trim();
    if (!documentId) { this.idempotentAckError = this.t('clientApi.documentRequired'); return; }
    this.idempotentAckLoading = true;
    const payload = {
      ackType: this.idempotentAckForm.ackType,
      externalReference: this.idempotentAckForm.externalReference || undefined,
      comment: this.idempotentAckForm.comment || undefined
    };
    const key = this.idempotentAckForm.idempotencyKey.trim() || undefined;
    this.documentService.putAcknowledgement(documentId, payload, key).pipe(finalize(() => { this.idempotentAckLoading = false; })).subscribe({
      next: r => { this.ackResult = r; },
      error: e => { this.idempotentAckError = this.extractError(e); }
    });
  }

  generateUuid(): void {
    this.idempotentAckForm.idempotencyKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── ETL: Batch ────────────────────────────────────────────
  prefillBatchJson(): void {
    const example = {
      items: [{
        documentId: this.idempotentAckForm.documentId || 'DOC_EXAMPLE_001',
        ackType: this.idempotentAckForm.ackType,
        idempotencyKey: this.idempotentAckForm.idempotencyKey || 'uuid-here',
        externalReference: this.idempotentAckForm.externalReference || undefined,
        comment: this.idempotentAckForm.comment || undefined
      }]
    };
    this.batchPayload = JSON.stringify(example, null, 2);
  }

  runBatch(): void {
    this.batchError = '';
    this.batchResult = null;
    let parsed: any;
    try {
      parsed = JSON.parse(this.batchPayload);
    } catch {
      this.batchError = this.t('clientApi.invalidJson');
      return;
    }
    const items = parsed?.items ?? parsed;
    if (!Array.isArray(items) || items.length === 0) { this.batchError = this.t('clientApi.itemsRequired'); return; }
    if (items.length > 200) { this.batchError = this.t('clientApi.batchLimitExceeded'); return; }
    this.batchLoading = true;
    this.documentService.batchAcknowledge(items).pipe(finalize(() => { this.batchLoading = false; })).subscribe({
      next: r => { this.batchResult = r; },
      error: e => { this.batchError = this.extractError(e); }
    });
  }

  // ── Admin: Search ─────────────────────────────────────────
  runSearch(): void {
    this.searchError = '';
    this.searchResponse = null;
    const query = this.searchForm.q.trim();
    if (!query) { this.searchError = this.t('clientApi.queryRequired'); return; }
    this.searchLoading = true;
    this.documentService.searchDocuments(query, { entityCode: this.searchForm.entityCode || null, limit: this.searchForm.limit || 10 }).pipe(finalize(() => { this.searchLoading = false; })).subscribe({
      next: r => { this.searchResponse = r; },
      error: e => { this.searchError = this.extractError(e); }
    });
  }

  useFirstSearchResult(): void {
    const first = this.searchResponse?.items?.[0];
    if (!first) return;
    this.ackForm.documentId = first.documentId;
    this.ackForm.entityCode = first.entityCode;
  }

  // ── Admin: Legacy ACK ─────────────────────────────────────
  sendAcknowledgement(): void {
    this.ackError = '';
    this.ackSuccess = '';
    const documentId = this.ackForm.documentId.trim();
    const entityCode = this.ackForm.entityCode.trim();
    if (!documentId || !entityCode) { this.ackError = this.t('clientApi.ackFieldsRequired'); return; }
    this.ackLoading = true;
    this.documentService.addAcknowledgement(entityCode, documentId, { type: this.ackForm.type, details: this.ackForm.details.trim() }).pipe(finalize(() => { this.ackLoading = false; })).subscribe({
      next: () => { this.ackSuccess = this.t('clientApi.ackSuccess'); },
      error: e => { this.ackError = this.extractError(e); }
    });
  }

  // ── Admin: Upload ─────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile = input.files?.[0] ?? null;
  }

  uploadDocument(): void {
    this.uploadError = '';
    this.uploadSuccess = '';
    if (!this.uploadFile) { this.uploadError = this.t('clientApi.fileRequired'); return; }
    const formData = new FormData();
    formData.append('destinataire', this.uploadForm.destinataire.trim());
    formData.append('entity', this.uploadForm.entity.trim());
    formData.append('type', this.uploadForm.type);
    formData.append('statut', this.uploadForm.statut);
    formData.append('file', this.uploadFile);
    this.uploadLoading = true;
    this.documentService.uploadDocument(formData).pipe(finalize(() => { this.uploadLoading = false; })).subscribe({
      next: r => { this.uploadSuccess = `${this.t('clientApi.uploadSuccess')}: ${r.path}`; },
      error: e => { this.uploadError = this.extractError(e); }
    });
  }

  // ── cURL previews ─────────────────────────────────────────
  deliveriesCurl(): string {
    const params: string[] = [];
    if (this.deliveriesForm.since) params.push(`since=${encodeURIComponent(this.deliveriesForm.since)}`);
    if (this.deliveriesForm.entityCode) params.push(`entityCode=${encodeURIComponent(this.deliveriesForm.entityCode)}`);
    params.push(`limit=${this.deliveriesForm.limit || 100}`);
    return `curl -X GET \\\n  "${this.origin()}/api/v1/deliveries?${params.join('&')}" \\\n  -H "Authorization: Bearer <token>"`;
  }

  directDownloadCurl(): string {
    const docId = this.directDownloadForm.documentId || '{documentId}';
    return `curl -X GET \\\n  "${this.origin()}/api/v1/documents/${docId}/content" \\\n  -H "Authorization: Bearer <token>" \\\n  --output "${docId}.bin"`;
  }

  idempotentAckCurl(): string {
    const docId = this.idempotentAckForm.documentId || '{documentId}';
    const key = this.idempotentAckForm.idempotencyKey || '{idempotency-key}';
    const body = JSON.stringify({ ackType: this.idempotentAckForm.ackType, externalReference: this.idempotentAckForm.externalReference || undefined, comment: this.idempotentAckForm.comment || undefined });
    return `curl -X PUT \\\n  "${this.origin()}/api/v1/documents/${docId}/acknowledgement" \\\n  -H "Authorization: Bearer <token>" \\\n  -H "Idempotency-Key: ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
  }

  batchCurl(): string {
    const preview = this.batchPayload.trim() || '{"items":[{"documentId":"DOC_001","ackType":"AR3","idempotencyKey":"uuid"}]}';
    return `curl -X POST \\\n  "${this.origin()}/api/v1/acknowledgements/batch" \\\n  -H "Authorization: Bearer <token>" \\\n  -H "Content-Type: application/json" \\\n  -d '${preview.replace(/\n/g, ' ')}'`;
  }

  searchCurl(): string {
    return `curl -X GET \\\n  "${this.origin()}/api/v1/search?q=${encodeURIComponent(this.searchForm.q || 'doc_2026')}&limit=${this.searchForm.limit || 10}" \\\n  -H "Authorization: Bearer <token>"`;
  }

  ackCurl(): string {
    const entity = this.ackForm.entityCode || '{entityCode}';
    const docId = this.ackForm.documentId || '{documentId}';
    return `curl -X POST \\\n  "${this.origin()}/api/v1/entities/${entity}/documents/${docId}/acknowledgements" \\\n  -H "Authorization: Bearer <token>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"type":"${this.ackForm.type}","details":"${this.ackForm.details || 'validated'}"}'`;
  }

  uploadCurl(): string {
    return `curl -X POST \\\n  "${this.origin()}/api/v1/documents/upload" \\\n  -H "Authorization: Bearer <token>" \\\n  -F "destinataire=${this.uploadForm.destinataire || 'Indigo'}" \\\n  -F "entity=${this.uploadForm.entity || 'ENT1'}" \\\n  -F "type=${this.uploadForm.type}" \\\n  -F "statut=${this.uploadForm.statut}" \\\n  -F "file=@./demo.zip"`;
  }

  private origin(): string { return globalThis.location?.origin ?? ''; }

  private extractError(error: any): string {
    const errObj = error?.error;
    if (typeof errObj?.code === 'string' && errObj.code.startsWith('error.')) {
      const translated = this.t(errObj.code);
      if (translated !== errObj.code) return translated;
    }
    if (typeof errObj?.message === 'string' && errObj.message.trim()) return errObj.message;
    if (typeof errObj?.detail === 'string' && errObj.detail.trim()) return errObj.detail;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    if (error?.status) return `${this.t('clientApi.httpError')} ${error.status}`;
    return this.t('clientApi.genericError');
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
