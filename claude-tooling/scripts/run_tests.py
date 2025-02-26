#!/usr/bin/env python3
"""
Test runner script for the Claude Tooling API.

This script runs all tests to verify the functionality of the Claude Tooling API,
making it easy to ensure that everything works correctly before and after refactoring.

Usage:
    python scripts/run_tests.py [options]

Options:
    --all             Run all tests (default)
    --api             Run only API tests
    --auto-execute    Run only auto execute tests
    --modularity      Run only modularity tests
    --verbose, -v     Run with verbose output
    --coverage        Run with coverage report
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

def run_tests(test_files, verbose=False, coverage=False):
    """Run pytest on the specified test files"""
    # Add -v flag for verbose output
    cmd = ["pytest"]
    if verbose:
        cmd.append("-v")
    
    # Add coverage if requested
    if coverage:
        cmd.extend(["--cov=app", "--cov-report=term-missing", "--cov-report=html"])
    
    # Add test files
    cmd.extend(test_files)
    
    print(f"Running command: {' '.join(cmd)}")
    
    # Run pytest
    result = subprocess.run(cmd, cwd=parent_dir)
    
    # Return exit code
    return result.returncode

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Run tests for Claude Tooling API")
    
    # Test selection options
    parser.add_argument("--all", action="store_true", help="Run all tests (default)")
    parser.add_argument("--api", action="store_true", help="Run only API tests")
    parser.add_argument("--auto-execute", action="store_true", help="Run only auto execute tests")
    parser.add_argument("--modularity", action="store_true", help="Run only modularity tests")
    
    # Other options
    parser.add_argument("--verbose", "-v", action="store_true", help="Run with verbose output")
    parser.add_argument("--coverage", action="store_true", help="Run with coverage report")
    
    return parser.parse_args()

def main():
    """Main function"""
    args = parse_args()
    
    # Determine which test files to run
    test_files = []
    
    # If no specific test group is selected or --all is used, run all tests
    run_all = not (args.api or args.auto_execute or args.modularity) or args.all
    
    if run_all or args.api:
        test_files.append("tests/test_app_api.py")
        
    if run_all or args.auto_execute:
        test_files.append("tests/test_auto_execute.py")
        
    if run_all or args.modularity:
        test_files.append("tests/test_app_modularity.py")
    
    # Run the tests
    exit_code = run_tests(test_files, args.verbose, args.coverage)
    
    # Print coverage report location if coverage was enabled
    if args.coverage:
        coverage_dir = os.path.join(parent_dir, "htmlcov")
        print(f"\nCoverage report available at: {coverage_dir}/index.html")
    
    # Return the exit code from pytest
    return exit_code
    
if __name__ == "__main__":
    sys.exit(main()) 