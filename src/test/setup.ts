import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// jsdom 29 does not synthesize CSS shorthand values (like `border`) in getComputedStyle.
// This custom matcher extends toHaveStyle to fall back to checking the inline style
// attribute string for CSS shorthand properties that jsdom cannot compute.
expect.extend({
  toHaveStyle(this: any, element: HTMLElement, css: string | Record<string, string>) {
    // Normalize input to object
    const styles: Record<string, string> = typeof css === 'string'
      ? Object.fromEntries(
          css.split(';')
            .filter(Boolean)
            .map((s) => {
              const idx = s.indexOf(':')
              return [s.slice(0, idx).trim(), s.slice(idx + 1).trim()]
            })
        )
      : { ...css }

    const computedStyle = window.getComputedStyle(element)
    // Use a temp element to normalize the expected value (same as jest-dom does)
    const doc = element.ownerDocument
    const allMatch = Object.entries(styles).every(([prop, value]) => {
      // Normalize expected value
      const copy = doc.createElement('div')
      copy.style.setProperty(prop, value)
      const normalizedExpected = copy.style.getPropertyValue(prop)

      // Try computed style
      const computedVal = computedStyle.getPropertyValue(prop)
      if (computedVal && computedVal.trim() !== '') {
        return computedVal === (normalizedExpected || value)
      }
      // Try camelCase on computed
      const camel = prop.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())
      const computedCamel = (computedStyle as Record<string, string>)[camel]
      if (computedCamel && computedCamel.trim() !== '') {
        return computedCamel === (normalizedExpected || value)
      }
      // Fallback: check the style attribute string for partial match
      // This handles jsdom's inability to compute shorthand values like `border`
      const styleAttr = (element.getAttribute('style') ?? '').toLowerCase()
      const propLower = prop.toLowerCase()
      if (styleAttr.includes(propLower + ':') || styleAttr.includes(propLower + ' :')) {
        // Check that the value appears in the style attribute after the property name
        const valLower = value.trim().toLowerCase()
        const propIdx = styleAttr.indexOf(propLower + ':')
        if (propIdx !== -1) {
          const afterColon = styleAttr.slice(propIdx + propLower.length + 1)
          const semiIdx = afterColon.indexOf(';')
          const attrVal = (semiIdx !== -1 ? afterColon.slice(0, semiIdx) : afterColon).trim()
          return attrVal.startsWith(valLower) || valLower === attrVal
        }
      }
      return false
    })

    return {
      pass: allMatch,
      message: () =>
        allMatch
          ? `Expected element NOT to have style: ${JSON.stringify(styles)}`
          : `Expected element to have style: ${JSON.stringify(styles)}\n  Inline: ${element.getAttribute('style')}\n  Computed: border="${computedStyle.getPropertyValue('border')}"`,
    }
  },
})
