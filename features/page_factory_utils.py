

def find_elements_in_page_factory(page_factory_obj, key):
    """
    Find WebElements in page factory, because page factory can
    only find WebElement
    """
    locator_type = page_factory_obj.locators[key][0]
    search_value = page_factory_obj.locators[key][1]
    elements = page_factory_obj.driver.find_elements(
        page_factory_obj.TYPE_OF_LOCATORS[locator_type.lower()], search_value)

    return elements


def find_element_in_page_factory(page_factory_obj, key):
    """
    Find WebElements in page factory, because page factory can
    only find WebElement
    """
    locator_type = page_factory_obj.locators[key][0]
    search_value = page_factory_obj.locators[key][1]
    element = page_factory_obj.driver.find_element(
        page_factory_obj.TYPE_OF_LOCATORS[locator_type.lower()], search_value)

    return element
