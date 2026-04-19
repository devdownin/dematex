import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DocumentService } from './document.service';

describe('DocumentService', () => {
  let service: DocumentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DocumentService]
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
});
