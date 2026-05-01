package com.dematex.backend.service;

import com.dematex.backend.model.DocumentType;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.xml.XMLConstants;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.Enumeration;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * Service de validation utilisant StAX (Streaming API for XML) pour une performance optimale.
 * L'approche streaming permet de traiter des fichiers de grande taille sans charger tout le DOM en mémoire.
 */
@Service
@Slf4j
public class ValidationService {

    private final XMLInputFactory factory = XMLInputFactory.newInstance();
    private final SchemaService schemaService;

    // Cache thread-safe des Schemas compilés (Schema est documenté thread-safe).
    private final Map<DocumentType, Schema> schemaCache = new EnumMap<>(DocumentType.class);

    public ValidationService(SchemaService schemaService) {
        this.schemaService = schemaService;
    }

    private Schema getCachedSchema(DocumentType type) throws Exception {
        Schema cached = schemaCache.get(type);
        if (cached != null) {
            return cached;
        }
        synchronized (schemaCache) {
            cached = schemaCache.get(type);
            if (cached == null) {
                SchemaFactory schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
                cached = schemaFactory.newSchema(schemaService.getLatestSchema(type).getURL());
                schemaCache.put(type, cached);
            }
            return cached;
        }
    }

    /**
     * Valide un document XML par rapport à son schéma XSD.
     */
    public void validate(InputStream inputStream, DocumentType type) throws Exception {
        Validator validator = getCachedSchema(type).newValidator();
        validator.validate(new StreamSource(inputStream));
    }

    public void validate(Path path, DocumentType type) throws Exception {
        if (isZipPayload(path)) {
            try (ZipFile zipFile = new ZipFile(path.toFile())) {
                Enumeration<? extends ZipEntry> entries = zipFile.entries();
                while (entries.hasMoreElements()) {
                    ZipEntry entry = entries.nextElement();
                    if (!entry.isDirectory() && entry.getName().toLowerCase().endsWith(".xml")) {
                        try (InputStream is = zipFile.getInputStream(entry)) {
                            validate(is, type);
                        }
                        return;
                    }
                }
                throw new IllegalStateException("Aucun fichier XML trouvé dans le ZIP : " + path);
            }
        } else {
            try (InputStream is = Files.newInputStream(path)) {
                validate(is, type);
            }
        }
    }

    /**
     * La convention de nommage utilise l'extension comme statut métier (ex: doc.zip.AR3).
     * On considère qu'un fichier est un ZIP si la dernière extension non-statut est ".zip"
     * ou si la signature binaire correspond à PK\003\004.
     */
    private boolean isZipPayload(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        if (name.endsWith(".zip")) {
            return true;
        }
        int lastDot = name.lastIndexOf('.');
        if (lastDot > 0) {
            String beforeStatus = name.substring(0, lastDot);
            if (beforeStatus.endsWith(".zip")) {
                return true;
            }
        }
        // Fallback : signature binaire (PK\003\004)
        try (InputStream is = Files.newInputStream(path)) {
            byte[] header = is.readNBytes(4);
            return header.length == 4
                    && header[0] == 0x50 && header[1] == 0x4B
                    && header[2] == 0x03 && header[3] == 0x04;
        } catch (Exception e) {
            return false;
        }
    }

    @Data @Builder
    public static class CrmensContent {
        private String issuer;
        private String entity;
        private String period;
        private BigDecimal totalTtc;
    }

    @Data @Builder
    public static class VtisContent {
        private String issuer;
        private String entity;
        private String period;
        private BigDecimal rub1;
        private BigDecimal rub2;
        private BigDecimal rub3;
        public BigDecimal getTotal() { return rub1.add(rub2).add(rub3); }
    }

    @Data @Builder
    public static class FtisContent {
        private String issuer;
        private String entity;
        private String period;
        private String clientType;
        private List<Invoice> invoices;

        @Data @Builder
        public static class Invoice {
            private String id;
            private BigDecimal amountTtc;
            private String crmensRef;
        }
        public BigDecimal getTotal() {
            return invoices.stream().map(Invoice::getAmountTtc).reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    @Data @Builder
    public static class PtisContent {
        private String issuer;
        private String entity;
        private String period;
        private List<Payment> payments;

        @Data @Builder
        public static class Payment {
            private String invoiceId;
            private BigDecimal amount;
            private String type;
        }
    }

    public CrmensContent parseCrmens(InputStream inputStream) throws XMLStreamException {
        XMLStreamReader reader = factory.createXMLStreamReader(inputStream);
        CrmensContent.CrmensContentBuilder builder = CrmensContent.builder();

        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                String name = reader.getLocalName();
                switch (name) {
                    case "issuer" -> builder.issuer(reader.getElementText());
                    case "entity" -> builder.entity(reader.getElementText());
                    case "period" -> builder.period(reader.getElementText());
                    case "totalTtc" -> builder.totalTtc(new BigDecimal(reader.getElementText()));
                }
            }
        }
        return builder.build();
    }

    public VtisContent parseVtis(InputStream inputStream) throws XMLStreamException {
        XMLStreamReader reader = factory.createXMLStreamReader(inputStream);
        VtisContent.VtisContentBuilder builder = VtisContent.builder();

        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                String name = reader.getLocalName();
                switch (name) {
                    case "issuer" -> builder.issuer(reader.getElementText());
                    case "entity" -> builder.entity(reader.getElementText());
                    case "period" -> builder.period(reader.getElementText());
                    case "rub1" -> builder.rub1(new BigDecimal(reader.getElementText()));
                    case "rub2" -> builder.rub2(new BigDecimal(reader.getElementText()));
                    case "rub3" -> builder.rub3(new BigDecimal(reader.getElementText()));
                }
            }
        }
        return builder.build();
    }

    public FtisContent parseFtis(InputStream inputStream) throws Exception {
        XMLStreamReader reader = factory.createXMLStreamReader(inputStream);
        FtisContent.FtisContentBuilder builder = FtisContent.builder();
        List<FtisContent.Invoice> invoices = new ArrayList<>();

        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                String name = reader.getLocalName();
                switch (name) {
                    case "issuer" -> builder.issuer(reader.getElementText());
                    case "entity" -> builder.entity(reader.getElementText());
                    case "period" -> builder.period(reader.getElementText());
                    case "clientType" -> builder.clientType(reader.getElementText());
                    case "invoice" -> invoices.add(parseInvoice(reader));
                }
            }
        }
        return builder.invoices(invoices).build();
    }

    private FtisContent.Invoice parseInvoice(XMLStreamReader reader) throws Exception {
        FtisContent.Invoice.InvoiceBuilder builder = FtisContent.Invoice.builder();
        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                String name = reader.getLocalName();
                switch (name) {
                    case "id" -> builder.id(reader.getElementText());
                    case "amountTtc" -> builder.amountTtc(new BigDecimal(reader.getElementText()));
                    case "crmensRef" -> builder.crmensRef(reader.getElementText());
                }
            } else if (event == XMLStreamConstants.END_ELEMENT && "invoice".equals(reader.getLocalName())) {
                break;
            }
        }
        return builder.build();
    }

    public PtisContent parsePtis(InputStream inputStream) throws Exception {
        XMLStreamReader reader = factory.createXMLStreamReader(inputStream);
        PtisContent.PtisContentBuilder builder = PtisContent.builder();
        List<PtisContent.Payment> payments = new ArrayList<>();

        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                String name = reader.getLocalName();
                switch (name) {
                    case "issuer" -> builder.issuer(reader.getElementText());
                    case "entity" -> builder.entity(reader.getElementText());
                    case "period" -> builder.period(reader.getElementText());
                    case "payment" -> payments.add(parsePayment(reader));
                }
            }
        }
        return builder.payments(payments).build();
    }

    private PtisContent.Payment parsePayment(XMLStreamReader reader) throws Exception {
        PtisContent.Payment.PaymentBuilder builder = PtisContent.Payment.builder();
        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                String name = reader.getLocalName();
                switch (name) {
                    case "invoiceId" -> builder.invoiceId(reader.getElementText());
                    case "amount" -> builder.amount(new BigDecimal(reader.getElementText()));
                    case "type" -> builder.type(reader.getElementText());
                }
            } else if (event == XMLStreamConstants.END_ELEMENT && "payment".equals(reader.getLocalName())) {
                break;
            }
        }
        return builder.build();
    }
}
