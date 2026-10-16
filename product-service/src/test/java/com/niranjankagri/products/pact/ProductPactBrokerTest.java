package com.niranjankagri.products.pact;

import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.loader.PactBroker;
import au.com.dius.pact.provider.junitsupport.loader.PactBrokerConsumerVersionSelectors;
import au.com.dius.pact.provider.junitsupport.loader.SelectorBuilder;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

/**
 * Verifies the contracts stored in the Pact Broker and (with pact.verifier.publishResults=true) sends the results
 * back, so the broker knows which consumer and provider versions work together (can-i-deploy).
 *
 * Runs only when a broker URL is set (PACT_BROKER_BASE_URL, passed in by Maven as pactbroker.url).
 *
 * - Which consumer versions: the selectors below.
 * - Pending pacts: a contract this provider has never passed does not fail the provider's build; the failure is
 *   still recorded, so the CONSUMER cannot deploy. A consumer's new expectation never blocks the provider team.
 * - WIP pacts: contracts from consumer feature branches are verified too (as pending), so their authors get
 *   feedback before they merge.
 */
@Provider("product-service")
@PactBroker(
    url = "${pactbroker.url}",
    providerBranch = "${pact.provider.branch:main}",
    enablePendingPacts = "true",
    includeWipPactsSince = "2026-01-01")
@EnabledIfSystemProperty(named = "pactbroker.url", matches = "https?://.+")
public class ProductPactBrokerTest extends ProductPactVerificationBase {

    /**
     * The consumer versions to verify: the latest on each consumer's main branch, every version that is deployed
     * or released, and versions on a branch with the same name as this provider's branch.
     * Pact requires the method (and so the class) to be public.
     */
    @PactBrokerConsumerVersionSelectors
    public static SelectorBuilder consumerVersionSelectors() {
        return new SelectorBuilder().mainBranch().deployedOrReleased().matchingBranch();
    }
}
