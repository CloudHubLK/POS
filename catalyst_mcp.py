from fastmcp import FastMCP
import zcatalyst_sdk

# Initialize FastMCP
mcp = FastMCP("ZohoCatalyst")

@mcp.tool()
def query_catalyst_db(ql_query: str) -> str:
    """Executes a ZCQL query against the Zoho Catalyst Data Store."""
    try:
        # App automatically initializes using active local Catalyst CLI credentials
        app = zcatalyst_sdk.initialize()
        zcql_service = app.zcql()
        query_result = zcql_service.execute_query(ql_query)
        return str(query_result)
    except Exception as e:
        return f"Error executing query: {str(e)}"

@mcp.tool()
def trigger_catalyst_function(function_name: str, payload: dict) -> str:
    """Invokes a specific backend serverless function in Zoho Catalyst."""
    try:
        app = zcatalyst_sdk.initialize()
        functions_service = app.functions()
        result = functions_service.execute(function_name, payload)
        return str(result.get_content())
    except Exception as e:
        return f"Failed to execute function: {str(e)}"

if __name__ == "__main__":
    mcp.run()