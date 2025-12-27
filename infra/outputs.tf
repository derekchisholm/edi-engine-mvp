output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "acr_admin_username" {
  value     = azurerm_container_registry.acr.admin_username
  sensitive = true
}

output "acr_admin_password" {
  value     = azurerm_container_registry.acr.admin_password
  sensitive = true
}

output "app_url" {
  value = azurerm_container_app.app.latest_revision_fqdn
}

output "ui_url" {
  value = azurerm_container_app.ui.latest_revision_fqdn
}
