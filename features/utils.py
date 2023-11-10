import requests

def server_is_ready(url):
    try:
        response = requests.get(url, verify=False)
        print("Status Code:", response.status_code)
        if response.status_code == 200:
            return True
    except ConnectionError as e:
        print("Connection error:", e)
        return False
    except Exception as e:  # This will catch other exceptions that may occur.
        print("An error occurred:", e)
        return False
    return False