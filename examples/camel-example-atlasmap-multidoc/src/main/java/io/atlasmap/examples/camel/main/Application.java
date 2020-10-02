package io.atlasmap.examples.camel.main;

import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.main.Main;

public class Application extends RouteBuilder {

    @Override
    public void configure() throws Exception {
        from("timer:main?period=5000")
            .to("direct:order-producer")
            .to("direct:contact-producer")
            .to("atlas:atlasmapping-UI.0_new.json")
            .to("direct:outcome-consumer");

        from("direct:order-producer")
            .setProperty("order-schema-2426fd12-f113-4e55-a930-0d5bac62d09f", simple("resource:classpath:data/order.json"))
            .log("-->; Order: [${exchangeProperty.order-schema}]");
        
        from("direct:contact-producer")
            .setProperty("contact-schema-215b0c4d-8cc4-4d9c-88b9-68011ac40b75", simple("resource:classpath:data/contact.xml"))
            .log("-->; Contact: [${exchangeProperty.contact-schema}]");
        
        from("direct:outcome-consumer")
            .log("--< Outcome: [${body}]");
    }

    public static void main(String args[]) throws Exception {
        Main camelMain = new Main();
        camelMain.configure().addRoutesBuilder(new Application());
        camelMain.run(args);
    }
}
