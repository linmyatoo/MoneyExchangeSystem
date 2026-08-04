import os
import glob
import re

api_dir = "/Users/linmyatoo/Development/MoneyExchangeSystem/backend/app/api/v1"

for file_path in glob.glob(f"{api_dir}/*.py"):
    with open(file_path, "r") as f:
        content = f.read()
    
    # Replace @router.METHOD("/", ...) with @router.METHOD("", ...)
    content = re.sub(r'@router\.(get|post|put|delete|patch)\(\s*"/"\s*(,|\))', r'@router.\1(""\2', content)
    
    with open(file_path, "w") as f:
        f.write(content)

print("Fixed trailing slashes in FastAPI routers!")
