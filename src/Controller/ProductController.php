<?php
namespace App\Controller;

use App\Website\LinkGenerator\ProductLinkGenerator;
use Pimcore\Controller\FrontendController;
use Pimcore\Model\DataObject\AbstractObject;
use Pimcore\Model\DataObject\Product;
use Pimcore\Model\Exception\NotFoundException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;

class ProductController extends FrontendController
{
    /**
     * @Route ("/shop", name="product-listing")
     */
    public function indexAction(Request $request): Response
    {
        $listing = new Product\Listing;

        return $this->render('product/list.html.twig', [
            'products' => $listing
        ]);
    }
    /**
     * @Route("/shop/{slug}-{productId}", name="shop-detail", requirements={"slug"="[\w-]+", "productId"="\d+"})
     */
    public function showAction( Request $request, int $productId, ProductLinkGenerator $productLinkGenerator )
    {
        $paramsBag=[];
        $product = Product::getById($productId);

        if (!($product and $product->isPublished())) {
            throw new NotFoundException('Product Not Found.');
        }
        $generatorUrl = $productLinkGenerator->generate($product);
        if ($generatorUrl != $request->getPathInfo()) {
            $queryString = $request->getQueryString();

            return $this->redirect($generatorUrl . ($queryString ? '?' . $queryString : ''));
        }

        $paramsBag['product'] = $product;
        return $this->render('product/detail.html.twig', $paramsBag);

    }
    public function productTeaserAction(Request $request ): Response
    {
        $paramsBag = [];

        $type = $request->attributes->get('type') ?: $request->query->get('type');
        if ($type === 'object') {
            AbstractObject::setGetInheritedValues(true);

            $id = $request->attributes->getInt('id') ?: $request->query->getInt('id');
            $product = Product::getById($id);

            if (!$product instanceof Product || !$product->isPublished()) {
                throw new NotFoundHttpException('Product not found.');
            }

            $paramsBag['product'] = $product;

            return $this->render('product/product-teaser.html.twig', $paramsBag);
        }

        throw new NotFoundHttpException('Invalid teaser object.');
    }
}

