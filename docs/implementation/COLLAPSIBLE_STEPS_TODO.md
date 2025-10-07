
## Status: Partially Complete

### What's Done:
- ✅ Icons imported (ChevronDown, ChevronUp)
- ✅ State variables added (resumeCollapsed, linkedinCollapsed)
- ✅ Refs added (linkedinRef, coverLetterRef)
- ✅ Auto-collapse and scroll useEffects added
- ✅ Real-time progress events added to service
- ✅ Event listeners added to components

### What's Needed:
- Replace Step 1 render (lines 472-488) with collapsible version
- Replace Step 2 render (lines 490-528) with collapsible version + ref
- Add ref to Step 3 (line 531)

### Collapsed Card Template:
```tsx
{completed && collapsed ? (
  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCollapsed(false)}>
    <CardContent className="py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <p className="font-medium">Title</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>
        <ChevronDown className="w-5 h-5 text-gray-400" />
      </div>
    </CardContent>
  </Card>
) : (
  <div>
    {completed && (
      <Button variant="ghost" size="sm" className="mb-2 text-xs" onClick={() => setCollapsed(true)}>
        <ChevronUp className="w-3 h-3 mr-1" />
        Collapse
      </Button>
    )}
    <FileUploadCard ... />
  </div>
)}
```

## Due to Token Limits

The complete implementation requires updating large sections of JSX in NewUserOnboarding.tsx.  
All the logic is in place, just needs the render updates applied.

Would you like me to provide the complete code to paste, or shall we continue in a fresh context?
