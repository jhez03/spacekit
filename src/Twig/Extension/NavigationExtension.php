<?php

namespace App\Twig\Extension;

use App\Website\LinkGenerator\AbstractProductLinkGenerator;
use App\Website\LinkGenerator\CategoryLinkGenerator;
use App\Website\LinkGenerator\ProductLinkGenerator;
use Pimcore\Model\Document;
use Pimcore\Navigation\Container;
use Pimcore\Navigation\Page\Document as NavDocument;
use Pimcore\Twig\Extension\Templating\Navigation;
use Pimcore\Twig\Extension\Templating\Placeholder;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

class NavigationExtension extends AbstractExtension
{
    const NAVIGATION_EXTENSION_POINT_PROPERTY = 'navigation_extension_point';

    public function __construct(
        protected Navigation $navigationHelper,
        protected Placeholder $placeholderHelper,
        protected CategoryLinkGenerator $categoryLinkGenerator,
        protected ProductLinkGenerator $productLinkGenerator
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('app_navigation_data_links', [$this, 'getDataLinks']),
            new TwigFunction('app_navigation_enrich_breadcrumbs', [$this, 'enrichBreadcrumbs'])
        ];
    }

    public function getDataLinks(Document $document, Document $startNode): Container
    {

        $navigation = $this->navigationHelper->build([
            'active' => $document,
            'root' => $startNode,

        ]);
        return $navigation;

    }

    /**
     * @throws \Exception
     */
    public function enrichBreadcrumbs(Container $navigation): Container
    {
        $additionalBreadCrumbs = $this->placeholderHelper->__invoke('addBreadcrumb');

        if ($additionalBreadCrumbs->getArrayCopy()) {
            $parentPage = false;

            foreach ($additionalBreadCrumbs->getArrayCopy() as $breadcrumb) {
                $page = $navigation->findBy('id', $breadcrumb['id']);
                if (null === $page) {
                    $parentPage = $parentPage ?: $navigation->findBy('id', $breadcrumb['parentId']);
                    $newPage = new \Pimcore\Navigation\Page\Document([
                        'id' => $breadcrumb['id'],
                        'uri' => isset($breadcrumb['url']) && $breadcrumb['url'] != '' ? $breadcrumb['url'] : '',
                        'label' => $breadcrumb['label'],
                        'active' => true
                    ]);
                    if ($parentPage) {
                        $parentPage->setActive(false);
                        $parentPage->addPage($newPage);
                        $parentPage = $newPage;
                    } else {
                        $navigation->addPage($newPage);
                    }
                }
            }
        }

        return $navigation;
    }
}

