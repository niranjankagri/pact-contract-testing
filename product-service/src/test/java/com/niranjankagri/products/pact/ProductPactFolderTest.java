package com.niranjankagri.products.pact;

import au.com.dius.pact.provider.junitsupport.IgnoreNoPactsToVerify;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import org.junit.jupiter.api.condition.DisabledIfSystemProperty;

/**
 * Verifies the pact files in the repository's pacts/ folder (written by checkout-web's tests): the quick local
 * loop without a broker. Skipped when a broker URL is set (then ProductPactBrokerTest runs instead), and passes
 * with a note when there are no pact files yet.
 */
@Provider("product-service")
@PactFolder("../pacts")
@IgnoreNoPactsToVerify
@DisabledIfSystemProperty(named = "pactbroker.url", matches = "https?://.+")
class ProductPactFolderTest extends ProductPactVerificationBase {
}
