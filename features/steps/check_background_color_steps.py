from behave import given, when, then
from selenium import webdriver
from selenium.webdriver.common.by import By
import subprocess
import time
from features.utils import server_is_ready

@given('the OSIM dev server is running')
def step_impl(context):
    context.dev_server = subprocess.Popen(["yarn", "run", "dev"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    context.server_url = "https://localhost:5173/"
    # Polling the server every half a second for a maximum of 10 seconds
    for _ in range(20):
        if server_is_ready(context.server_url):
            break
        time.sleep(0.5)
    else:
        # If the server isn't ready after 10 seconds, stop the process and raise an error
        context.dev_server.terminate()
        raise Exception("The OSIM dev server did not start in time.")


@given('I am on the OSIM local development page')
def step_impl(context):
    context.browser = webdriver.Chrome()  # or use Firefox(), or the browser of your choice
    context.browser.get("https://localhost:5173/")  # Replace 3000 with whatever port your dev server uses

@when('I retrieve the background color of the page')
def step_impl(context):
    body = context.browser.find_element(By.TAG_NAME, 'body')
    context.bg_color = body.value_of_css_property('background-color')

@then('the background color should be the expected color')
def step_impl(context):
    expected_color = 'rgba(32, 33, 36, 1)'  # This should be the expected color in RGBA format
    assert context.bg_color == expected_color, f"Background color was {context.bg_color}, expected {expected_color}"

@then('I close the browser and server')
def step_impl(context):
    context.browser.quit()
    context.dev_server.terminate()