from pymilvus import connections

def test_connection():
    try:
        # Connect to Milvus
        connections.connect(
            host='localhost',
            port='19530'
        )
        print("Successfully connected to Milvus!")
        # Get server version
        from pymilvus import utility
        print(f"Server version: {utility.get_server_version()}")
    except Exception as e:
        print(f"Failed to connect to Milvus: {str(e)}")
    finally:
        # Close connection
        connections.disconnect("default")

if __name__ == "__main__":
    test_connection()
