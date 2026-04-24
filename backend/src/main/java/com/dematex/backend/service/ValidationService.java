package com.dematex.backend.service;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Service de validation utilisant StAX (Streaming API for XML) pour une performance optimale.
 * L'approche streaming permet de traiter des fichiers de grande taille sans charger tout le DOM en mémoire.
 */
@Service
@Slf4j
public class ValidationService {

    private final XMLInputFactory factory = XMLInputFactory.newInstance();

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
