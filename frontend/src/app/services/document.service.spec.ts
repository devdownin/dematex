import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DocumentService } from './document.service';

describe('DocumentService', () => {
  let service: DocumentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(DocumentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch stats', () => {
    const mockStats = { totalDocuments: 10, ar3Completed: 5, ar3Pending: 5, ar3CompletionRate: 50, lateDocuments: 2 };

    service.getStats().subscribe(stats => {
      expect(stats.totalDocuments).toBe(10);
    });

    const req = httpMock.expectOne('/api/v1/stats');
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('should fetch document by id', () => {
    const mockDoc = { documentId: 'DOC-1' } as any;

    service.getDocument('DOC-1').subscribe(doc => {
      expect(doc.documentId).toBe('DOC-1');
    });

    const req = httpMock.expectOne('/api/v1/documents/DOC-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockDoc);
  });

  it('should fetch audit logs', () => {
    const mockLogs = { items: [{ id: 1, action: 'CREATE', timestamp: '2026-04-25T00:00:00Z', user: 'admin' }], nextCursor: null, hasMore: false, totalCount: 1 };

    service.getAuditLogs({ limit: 25 }).subscribe(response => {
      expect(response.items).toHaveLength(1);
      expect(response.totalCount).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/audit?limit=25');
    expect(req.request.method).toBe('GET');
    req.flush(mockLogs);
  });

  it('should post an acknowledgement update', () => {
    service.addAcknowledgement('ENT1', 'DOC-1', { type: 'AR3' as any, details: 'validated' }).subscribe();

    const req = httpMock.expectOne('/api/v1/entities/ENT1/documents/DOC-1/acknowledgements');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'AR3', details: 'validated' });
    req.flush(null);
  });

  it('should upload a document as multipart form-data', () => {
    const formData = new FormData();
    formData.append('destinataire', 'Indigo');
    formData.append('entity', 'ENT1');
    formData.append('type', 'FTIS');
    formData.append('statut', 'xml');
    formData.append('file', new Blob(['demo']), 'demo.zip');

    service.uploadDocument(formData).subscribe(response => {
      expect(response.status).toBe('uploaded');
    });

    const req = httpMock.expectOne('/api/v1/documents/upload');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ path: '/tmp/demo.zip', status: 'uploaded' });
  });
});
