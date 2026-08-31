import unittest
from pathlib import Path

from sec_pipeline.profiles.registry import build_company_profiles


class CompanyProfilesTest(unittest.TestCase):
    def test_registry_preserves_reviewed_company_and_evidence_order(self) -> None:
        profiles = build_company_profiles(Path("sources"))

        self.assertEqual(["aapl", "walmart", "jpmorgan"], [profile.slug for profile in profiles])
        self.assertEqual(
            ["0000320193", "0000104169", "0000019617"],
            [profile.cik for profile in profiles],
        )
        self.assertEqual(
            [
                "revenue",
                "gross_profit",
                "net_income",
                "operating_cash_flow",
                "capital_expenditure",
                "diluted_eps",
                "diluted_weighted_average_shares",
                "cash_and_cash_equivalents",
                "marketable_securities_current",
                "marketable_securities_noncurrent",
                "commercial_paper",
            ],
            [definition.name for definition in profiles[0].evidence],
        )
        self.assertEqual(
            [
                "revenue",
                "gross_profit",
                "net_income",
                "operating_cash_flow",
                "capital_expenditure",
                "diluted_eps",
                "diluted_weighted_average_shares",
                "cash_and_cash_equivalents",
                "inventory",
                "accounts_payable",
            ],
            [definition.name for definition in profiles[1].evidence],
        )
        self.assertEqual(
            [
                "revenue",
                "net_interest_income",
                "noninterest_income",
                "noninterest_expense",
                "provision_for_credit_losses",
                "net_income",
                "diluted_eps",
                "diluted_weighted_average_shares",
                "assets",
                "deposits",
            ],
            [definition.name for definition in profiles[2].evidence],
        )


if __name__ == "__main__":
    unittest.main()
