import { FileHelper } from "@supernovaio/export-helpers"
import { Supernova, PulsarContext, RemoteVersionIdentifier, AnyOutputFile, TokenType, ColorToken, DimensionToken, ShadowToken, GradientToken, StringToken, ProductCopyToken, AnyStringToken, Token } from "@supernovaio/sdk-exporters"
import { ExporterConfiguration } from "../config"
import { dive } from "./content/variable"

/**
 * Export entrypoint.
 * When running `export` through extensions or pipelines, this function will be called.
 * Context contains information about the design system and version that is currently being exported.
 */
Pulsar.export(async (sdk: Supernova, context: PulsarContext): Promise<Array<AnyOutputFile>> => {
  // Fetch data from design system that is currently being exported (context)
  const remoteVersionIdentifier: RemoteVersionIdentifier = {
    designSystemId: context.dsId,
    versionId: context.versionId,
  }

  // Fetch the necessary data
  let tokens = await sdk.tokens.getTokens(remoteVersionIdentifier)
  let tokenGroups = await sdk.tokens.getTokenGroups(remoteVersionIdentifier)

  // Filter by brand, if specified by the VSCode extension or pipeline configuration
  if (context.brandId) {
    tokens = tokens.filter((token) => token.brandId === context.brandId)
    tokenGroups = tokenGroups.filter((tokenGroup) => tokenGroup.brandId === context.brandId)
  }

  // Get each set of themed tokens. Light, Dark, Dynamic.
  const themes = await sdk.tokens.getTokenThemes({
    designSystemId: context.dsId,
    versionId: context.versionId,
  })

  // Combine the default token set with the themed token sets.
  const indexedThemes = [{name: 'light', tokens: tokens}]
  themes.map((t) => indexedThemes.push({name: t.name, tokens: t.overriddenTokens}))

  const mappedTokens = new Map(tokens.map((token) => [token.id, token]))

    // Convert all color tokens to CSS variables
  const variables = indexedThemes
    .map((t) => dive(t.tokens, mappedTokens, tokenGroups, t.name))
    .flat()
    .sort()

  // Remove repeat tokens. Has to be done since we parse all the default tokens that have the same value as Light themed ones.
  const unique = [...new Set(variables)].join('\n')


  // Create CSS file content
  let content = `${unique}`
  if (exportConfiguration.generateDisclaimer) {
    // Add disclaimer to every file if enabled
    content = `/* This file was generated by Supernova, don't change by hand */\n${content}`
  }

  // Create output file and return it
  return [
    FileHelper.createTextFile({
      relativePath: "./",
      fileName: "_variables.scss",
      content: content,
    }),
  ]
})

/** Exporter configuration. Adheres to the `ExporterConfiguration` interface and its content comes from the resolved default configuration + user overrides of various configuration keys */
export const exportConfiguration = Pulsar.exportConfig<ExporterConfiguration>()