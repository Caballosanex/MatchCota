import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class RuntimeTerraformContractTest(unittest.TestCase):
    def test_main_defines_lambda_and_http_api_runtime(self):
        main_tf = (ROOT / "main.tf").read_text()

        self.assertRegex(main_tf, r'resource\s+"aws_lambda_function"\s+"')
        self.assertRegex(main_tf, r'resource\s+"aws_apigatewayv2_api"\s+"')
        self.assertRegex(main_tf, r'protocol_type\s*=\s*"HTTP"')
        self.assertRegex(main_tf, r'route_key\s*=\s*"ANY /"')
        self.assertRegex(main_tf, r'route_key\s*=\s*"ANY /\{proxy\+\}"')
        self.assertRegex(main_tf, r'resource\s+"aws_lambda_permission"\s+"')
        self.assertRegex(main_tf, r'principal\s*=\s*"apigateway\.amazonaws\.com"')

    def test_variables_define_lambda_runtime_inputs(self):
        variables_tf = (ROOT / "variables.tf").read_text()

        for variable_name in [
            "lambda_artifact_path",
            "lambda_function_name",
            "lambda_handler",
            "lambda_runtime",
            "lambda_timeout",
            "lambda_memory_size",
            "lambda_environment_variables",
            "lambda_subnet_ids",
            "lambda_security_group_ids",
        ]:
            self.assertRegex(
                variables_tf,
                rf'variable\s+"{variable_name}"\s+\{{',
                msg=f"Missing variable definition: {variable_name}",
            )


if __name__ == "__main__":
    unittest.main()
