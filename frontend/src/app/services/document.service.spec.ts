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
    const mockLogs = [{ action: 'CREATE' }];

    service.getAuditLogs().subscribe(logs => {
      expect(logs).toHaveLength(1);
    });

    const req = httpMock.expectOne('/api/v1/audit');
    expect(req.request.method).toBe('GET');
    req.flush(mockLogs);
  });
});
