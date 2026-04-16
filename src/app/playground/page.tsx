import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Viewer } from "@/components/viewer/Viewer"

export default function PlaygroundPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Playground" />
        <div className="flex flex-1 flex-col min-h-0">
          <Viewer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
