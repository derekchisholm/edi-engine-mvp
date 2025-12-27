terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate-mgmt"
    storage_account_name = "tfstate1766821492"
    container_name       = "tfstate"
    key                  = "edi-engine.tfstate"
  }
}
