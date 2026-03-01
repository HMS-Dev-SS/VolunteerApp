#!/usr/bin/env python3
"""
Backend API Testing for Hidden Monkey Stays - Volunteer Screening CRM
Tests all critical endpoints reported with issues by the user
"""
import requests
import sys
import json
from datetime import datetime, timedelta

class HiddenMonkeyAPITester:
    def __init__(self, base_url="https://hms-volunteer.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.public_api = f"{base_url}/api/public"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, details="", status_code=None):
        """Log test results for reporting"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
            if status_code:
                print(f"   Status Code: {status_code}")
        
        self.test_results.append({
            "test": test_name,
            "passed": success,
            "details": details,
            "status_code": status_code
        })

    def test_public_access_code_verification(self):
        """Test /api/public/verify-code endpoint"""
        print("\n🔍 Testing Public Access Code Verification...")
        
        try:
            # Test with provided access code
            response = requests.post(f"{self.public_api}/verify-code", 
                                   json={"code": "rHtQOKcNwok"})
            
            if response.status_code == 200:
                data = response.json()
                if data.get("valid"):
                    self.log_result("Access Code Verification", True, "Access code verified successfully")
                    return True
                else:
                    self.log_result("Access Code Verification", False, "Code not marked as valid")
            else:
                self.log_result("Access Code Verification", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Access Code Verification", False, f"Exception: {str(e)}")
        
        return False

    def test_public_application_form(self):
        """Test /api/public/apply endpoint"""
        print("\n🔍 Testing Public Application Form Submission...")
        
        try:
            application_data = {
                "access_code": "rHtQOKcNwok",
                "name": "Test Candidate API",
                "email": "testapi@example.com",
                "phone": "+91 9876543210",
                "city": "Mumbai",
                "age": 25,
                "gender": "male",
                "role_applied": "content_creator",
                "start_date": "2024-12-01",
                "end_date": "2024-12-15",
                "is_creator": True,
                "instagram": "https://instagram.com/testuser",
                "portfolio_link": "https://portfolio.example.com",
                "skills": "Video editing, Photography, Social media",
                "why_volunteer": "I want to contribute my skills and learn new experiences while helping the community."
            }
            
            response = requests.post(f"{self.public_api}/apply", json=application_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("candidate_id"):
                    self.candidate_id = data["candidate_id"]
                    self.log_result("Public Application Form", True, f"Application submitted successfully. ID: {self.candidate_id}")
                    return True
                else:
                    self.log_result("Public Application Form", False, "Missing success or candidate_id in response")
            else:
                self.log_result("Public Application Form", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Public Application Form", False, f"Exception: {str(e)}")
        
        return False

    def test_user_login(self):
        """Test user authentication with provided credentials"""
        print("\n🔍 Testing User Authentication...")
        
        try:
            login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = requests.post(f"{self.api_base}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("access_token"):
                    self.token = data["access_token"]
                    self.log_result("User Login", True, "Authentication successful")
                    return True
                else:
                    self.log_result("User Login", False, "No access token in response")
            else:
                self.log_result("User Login", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("User Login", False, f"Exception: {str(e)}")
        
        return False

    def get_auth_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def test_ai_analysis_endpoint(self):
        """Test /api/evaluations/analyze/{id} endpoint"""
        print("\n🔍 Testing AI Analysis Endpoint...")
        
        if not self.token:
            self.log_result("AI Analysis", False, "No auth token available")
            return False
        
        try:
            # Use the test candidate ID from requirements
            candidate_id = "26ae8ee7-bdea-4bcd-ba29-7bbdbed00ba0"
            
            response = requests.post(f"{self.api_base}/evaluations/analyze/{candidate_id}", 
                                   headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get("evaluation") and data.get("candidate"):
                    evaluation = data["evaluation"]
                    # Check if AI scores are present
                    if all(key in evaluation for key in ["vibe_score", "skill_score", "stability_score", "total_score"]):
                        self.log_result("AI Analysis", True, 
                                      f"Analysis completed. Total score: {evaluation.get('total_score', 'N/A')}")
                        return True
                    else:
                        self.log_result("AI Analysis", False, "Missing required AI scores in response")
                else:
                    self.log_result("AI Analysis", False, "Missing evaluation or candidate data")
            else:
                self.log_result("AI Analysis", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("AI Analysis", False, f"Exception: {str(e)}")
        
        return False

    def test_re_evaluate_endpoint(self):
        """Test /api/candidates/{id}/re-evaluate endpoint"""
        print("\n🔍 Testing Re-evaluate Endpoint...")
        
        if not self.token:
            self.log_result("Re-evaluate", False, "No auth token available")
            return False
        
        try:
            candidate_id = "26ae8ee7-bdea-4bcd-ba29-7bbdbed00ba0"
            
            response = requests.post(f"{self.api_base}/candidates/{candidate_id}/re-evaluate", 
                                   headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get("iteration") and isinstance(data.get("iteration"), int):
                    self.log_result("Re-evaluate", True, 
                                  f"Re-evaluation completed. Iteration: {data.get('iteration')}")
                    return True
                else:
                    self.log_result("Re-evaluate", False, "Missing iteration number in response")
            elif response.status_code == 404:
                self.log_result("Re-evaluate", False, 
                              "Candidate not found or no previous evaluation exists", response.status_code)
            else:
                self.log_result("Re-evaluate", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Re-evaluate", False, f"Exception: {str(e)}")
        
        return False

    def test_calculate_score_endpoint(self):
        """Test /api/candidates/{id}/score endpoint"""
        print("\n🔍 Testing Calculate Score Endpoint...")
        
        if not self.token:
            self.log_result("Calculate Score", False, "No auth token available")
            return False
        
        try:
            candidate_id = "26ae8ee7-bdea-4bcd-ba29-7bbdbed00ba0"
            
            response = requests.post(f"{self.api_base}/candidates/{candidate_id}/score", 
                                   headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get("total_score") is not None and data.get("breakdown"):
                    self.log_result("Calculate Score", True, 
                                  f"Score calculated. Total: {data.get('total_score')}/100")
                    return True
                else:
                    self.log_result("Calculate Score", False, "Missing score or breakdown in response")
            else:
                self.log_result("Calculate Score", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Calculate Score", False, f"Exception: {str(e)}")
        
        return False

    def test_generate_email_endpoint(self):
        """Test /api/candidates/{id}/generate-email-v2 endpoint"""
        print("\n🔍 Testing Generate Email Endpoint...")
        
        if not self.token:
            self.log_result("Generate Email", False, "No auth token available")
            return False
        
        try:
            candidate_id = "26ae8ee7-bdea-4bcd-ba29-7bbdbed00ba0"
            
            response = requests.post(f"{self.api_base}/candidates/{candidate_id}/generate-email-v2", 
                                   headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get("subject") and data.get("body") and data.get("template_type"):
                    self.log_result("Generate Email", True, 
                                  f"Email generated. Template: {data.get('template_type')}")
                    return True
                else:
                    self.log_result("Generate Email", False, "Missing email subject, body or template type")
            else:
                self.log_result("Generate Email", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Generate Email", False, f"Exception: {str(e)}")
        
        return False

    def test_dashboard_stats(self):
        """Test /api/stats endpoint for dashboard"""
        print("\n🔍 Testing Dashboard Stats Endpoint...")
        
        if not self.token:
            self.log_result("Dashboard Stats", False, "No auth token available")
            return False
        
        try:
            response = requests.get(f"{self.api_base}/stats", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["total_candidates", "total_analyzed", "shortlisted", 
                                 "investigate", "rejected", "average_score", "pending_analysis"]
                
                if all(field in data for field in expected_fields):
                    self.log_result("Dashboard Stats", True, 
                                  f"Stats loaded. Total candidates: {data.get('total_candidates', 0)}")
                    return True
                else:
                    missing_fields = [f for f in expected_fields if f not in data]
                    self.log_result("Dashboard Stats", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Dashboard Stats", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Dashboard Stats", False, f"Exception: {str(e)}")
        
        return False

    def test_candidates_list(self):
        """Test /api/candidates endpoint"""
        print("\n🔍 Testing Candidates List Endpoint...")
        
        if not self.token:
            self.log_result("Candidates List", False, "No auth token available")
            return False
        
        try:
            response = requests.get(f"{self.api_base}/candidates", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Candidates List", True, 
                                  f"Candidates list loaded. Count: {len(data)}")
                    return True
                else:
                    self.log_result("Candidates List", False, "Response is not a list")
            else:
                self.log_result("Candidates List", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Candidates List", False, f"Exception: {str(e)}")
        
        return False

    def test_settings_weights(self):
        """Test /api/settings/weights endpoint"""
        print("\n🔍 Testing Settings Weights Endpoint...")
        
        if not self.token:
            self.log_result("Settings Weights", False, "No auth token available")
            return False
        
        try:
            # Test GET weights
            response = requests.get(f"{self.api_base}/settings/weights", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["vibe_psychology", "skill_competency", "stability_duration"]
                
                if all(field in data for field in expected_fields):
                    # Test PUT weights (update)
                    update_data = {
                        "vibe_psychology": 40,
                        "skill_competency": 30,
                        "stability_duration": 30
                    }
                    
                    update_response = requests.put(f"{self.api_base}/settings/weights",
                                                 json=update_data,
                                                 headers=self.get_auth_headers())
                    
                    if update_response.status_code == 200:
                        self.log_result("Settings Weights", True, "Weights get and update working")
                        return True
                    else:
                        self.log_result("Settings Weights", False, 
                                      f"Update failed: {update_response.text}", update_response.status_code)
                else:
                    missing_fields = [f for f in expected_fields if f not in data]
                    self.log_result("Settings Weights", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Settings Weights", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Settings Weights", False, f"Exception: {str(e)}")
        
        return False

    def test_smart_parse_endpoint(self):
        """Test /api/smart-parse endpoint for AI text extraction"""
        print("\n🔍 Testing Smart Parse Endpoint...")
        
        if not self.token:
            self.log_result("Smart Parse", False, "No auth token available")
            return False
        
        try:
            # Test data for Evan McCarthy as specified in bug report
            parse_data = {
                "raw_text": "My name is Evan McCarthy, I am 26 from Ireland. Phone: +918655299663. I can help with cleaning."
            }
            
            response = requests.post(f"{self.api_base}/smart-parse", 
                                   json=parse_data,
                                   headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                extracted = data.get("extracted_data", {})
                
                # Check if AI extracted the expected data
                if (extracted.get("name") and "Evan McCarthy" in extracted["name"] and
                    extracted.get("phone") and "+918655299663" in extracted["phone"]):
                    self.extracted_data = extracted  # Store for confirm test
                    self.log_result("Smart Parse", True, 
                                  f"AI extraction successful. Name: {extracted.get('name')}, Phone: {extracted.get('phone')}")
                    return True
                else:
                    self.log_result("Smart Parse", False, 
                                  f"AI extraction incomplete. Got: {extracted}")
            else:
                self.log_result("Smart Parse", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Smart Parse", False, f"Exception: {str(e)}")
        
        return False

    def test_smart_parse_confirm_endpoint(self):
        """Test /api/smart-parse/confirm endpoint - the bug fix target"""
        print("\n🔍 Testing Smart Parse Confirm Endpoint (Bug Fix Target)...")
        
        if not self.token:
            self.log_result("Smart Parse Confirm", False, "No auth token available")
            return False
        
        if not hasattr(self, 'extracted_data'):
            self.log_result("Smart Parse Confirm", False, "No extracted data available - run smart parse first")
            return False
        
        try:
            # Use the extracted data from the previous test
            # This tests the bug fix where email=None was causing issues
            candidate_data = {
                "name": self.extracted_data.get("name", "Evan McCarthy"),
                "email": self.extracted_data.get("email"),  # This might be None - testing the bug fix
                "phone": self.extracted_data.get("phone", "+918655299663"),
                "age": self.extracted_data.get("age", 26),
                "skills": ["cleaning"] if not self.extracted_data.get("skills") else self.extracted_data.get("skills"),
                "property_name": "Test Property"
            }
            
            response = requests.post(f"{self.api_base}/smart-parse/confirm", 
                                   json=candidate_data,
                                   headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id"):
                    self.smart_parse_candidate_id = data["id"]
                    self.log_result("Smart Parse Confirm", True, 
                                  f"Candidate created successfully. ID: {data['id']}")
                    return True
                else:
                    self.log_result("Smart Parse Confirm", False, "No candidate ID in response")
            else:
                self.log_result("Smart Parse Confirm", False, 
                              f"Failed: {response.text}", response.status_code)
        except Exception as e:
            self.log_result("Smart Parse Confirm", False, f"Exception: {str(e)}")
        
        return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Backend API Tests for Hidden Monkey Stays...")
        print(f"Backend URL: {self.base_url}")
        
        # Test public endpoints first (no auth required)
        self.test_public_access_code_verification()
        self.test_public_application_form()
        
        # Test authentication
        if not self.test_user_login():
            print("\n❌ Authentication failed - cannot test protected endpoints")
            self.print_summary()
            return False
        
        # Test protected endpoints
        self.test_ai_analysis_endpoint()
        self.test_re_evaluate_endpoint() 
        self.test_calculate_score_endpoint()
        self.test_generate_email_endpoint()
        self.test_dashboard_stats()
        self.test_candidates_list()
        self.test_settings_weights()
        
        self.print_summary()
        return self.tests_passed == self.tests_run

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print(f"📊 TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_passed != self.tests_run:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  • {result['test']}: {result['details']}")
        else:
            print("\n✅ All tests passed!")

def main():
    tester = HiddenMonkeyAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())