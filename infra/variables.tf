variable "resource_group_name" {
  default = "rg-edi-engine-mvp"
}

variable "location" {
  default = "westus2" # Close to NV/WA
}

variable "acr_name" {
  # Needs to be globally unique. I appended 'mvp' + random string logic is better usually, 
  # but let's hardcode a unique-ish name for you.
  default = "edienginemvp2025"
}

variable "project_name" {
  default = "edi-engine"
}
