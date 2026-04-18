package com.dematex.backend.config;
import com.dematex.backend.model.*;
import com.dematex.backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Random;

@Configuration
public class DataInitializer {
    @Bean CommandLineRunner initData(DocumentRepository repository, AcknowledgementRepository ackRepo) {
        return args -> {
            Random random = new Random();
            DocumentType[] types = DocumentType.values();
            AcknowledgementType[] statuses = AcknowledgementType.values();
            String[] entities = {"ENT001", "ENT002"};
            for (int i = 1; i <= 50; i++) {
                String docId = "DOC-" + String.format("%04d", i);
                AcknowledgementType status = statuses[random.nextInt(statuses.length)];
                Document doc = Document.builder().documentId(docId).type(types[random.nextInt(types.length)]).entityCode(entities[random.nextInt(entities.length)]).issuerCode("ISS001").period("2024-01").status(status).content("Sample".getBytes()).build();
                repository.save(doc);
                ackRepo.save(Acknowledgement.builder().documentId(docId).entityCode(doc.getEntityCode()).type(AcknowledgementType.AR0).details("Technical AR received").build());
                if (status != AcknowledgementType.AR0) {
                    ackRepo.save(Acknowledgement.builder().documentId(docId).entityCode(doc.getEntityCode()).type(AcknowledgementType.AR2).details("Functional AR received").build());
                }
                if (status == AcknowledgementType.AR3 || status == AcknowledgementType.AR4) {
                    ackRepo.save(Acknowledgement.builder().documentId(docId).entityCode(doc.getEntityCode()).type(AcknowledgementType.AR3).details("Legal proof recorded").build());
                }
            }
        };
    }
}
