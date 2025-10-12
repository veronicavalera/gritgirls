# entry point to app 
from app import create_app

app = create_app()

if __name__ == "__main__":
    # Run on port 8000 to match your frontend setup
    app.run(host="0.0.0.0", port=8000, debug=True)
